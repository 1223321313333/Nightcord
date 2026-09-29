/*
 * Nightcord installer for Windows.
 * Copyright (c) 2026 Nightcord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * A small WinForms app for .NET Framework 4.x, which every Windows 10/11 has, so it needs nothing else installed.
 * Built with the C# compiler that ships with .NET Framework: node scripts/nightcord/buildInstaller.mjs
 *
 * It downloads desktop.asar from the latest Nightcord release, checks its SHA-256 against the digest GitHub
 * reports for that file (or the desktop.asar.sha256 file next to it), and injects it into Discord the same way
 * NightcordInstaller.ps1 does: Discord's app.asar is kept as _app.asar and replaced by a tiny loader.
 */

using System;
using System.Collections;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Net;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Web.Script.Serialization;
using System.Windows.Forms;

[assembly: AssemblyTitle("Nightcord Installer")]
[assembly: AssemblyDescription("Installs Nightcord into Discord")]
[assembly: AssemblyProduct("Nightcord")]
[assembly: AssemblyCompany("Nightcord")]
[assembly: AssemblyCopyright("GPL-3.0-or-later")]
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.1.0.0")]

namespace NightcordInstaller
{
    static class Program
    {
        [STAThread]
        static int Main(string[] args)
        {
            try
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | (SecurityProtocolType)12288; // TLS 1.3
            }
            catch (NotSupportedException)
            {
                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12;
            }

            // --check <report>: download and verify the latest build without installing anything (used by CI)
            if (args.Length == 2 && args[0] == "--check") return Check(args[1]);
            // --install / --uninstall [report]: no window, every Discord found, closes and restarts Discord by itself
            if (args.Length >= 1 && (args[0] == "--install" || args[0] == "--uninstall"))
                return Silent(args[0] == "--install", args.Length >= 2 ? args[1] : null);

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            var form = new MainForm();

            // --render <png>: save a picture of the window and exit (for checking the layout)
            if (args.Length == 2 && args[0] == "--render")
            {
                form.Shown += delegate
                {
                    Application.DoEvents();
                    using (var bmp = new Bitmap(form.Width, form.Height))
                    {
                        form.DrawToBitmap(bmp, new Rectangle(0, 0, form.Width, form.Height));
                        bmp.Save(args[1], System.Drawing.Imaging.ImageFormat.Png);
                    }
                    form.Close();
                };
            }

            Application.Run(form);
            return 0;
        }

        static int Silent(bool install, string reportPath)
        {
            var report = new StringBuilder();
            string temp = null;
            try
            {
                var installs = Installer.FindInstalls();
                if (!install) installs = installs.Where(i => i.Patched).ToList();
                if (installs.Count == 0) throw new InvalidOperationException(install ? "Discord не найден." : "Nightcord не установлен ни в один Discord.");

                if (install)
                {
                    var release = Installer.GetRelease();
                    temp = Installer.Download(release, delegate { });
                    report.AppendLine("downloaded and verified " + release.Url);
                }

                var running = Installer.Running(installs);
                Installer.Close(running);

                if (install) Installer.PlaceAsar(temp);
                foreach (var i in installs)
                {
                    if (install) Installer.Inject(i);
                    else Installer.Restore(i);
                    report.AppendLine((install ? "installed into " : "removed from ") + i.Name + " (" + i.Resources + ")");
                }
                foreach (var i in running) Installer.Start(i);
                report.AppendLine("OK");
                return 0;
            }
            catch (Exception ex)
            {
                report.AppendLine("FAILED: " + ex.GetType().Name + ": " + ex.Message);
                return 1;
            }
            finally
            {
                Installer.TryDelete(temp);
                if (reportPath != null) File.WriteAllText(reportPath, report.ToString());
            }
        }

        static int Check(string reportPath)
        {
            var report = new StringBuilder();
            try
            {
                var release = Installer.GetRelease();
                report.AppendLine("url: " + release.Url);
                report.AppendLine("expected sha256: " + release.Sha256);
                string temp = Installer.Download(release, delegate { });
                report.AppendLine("downloaded " + new FileInfo(temp).Length + " bytes, sha256 matches");
                Installer.TryDelete(temp);
                report.AppendLine("OK");
                return 0;
            }
            catch (Exception ex)
            {
                report.AppendLine("FAILED: " + ex.GetType().Name + ": " + ex.Message);
                return 1;
            }
            finally
            {
                File.WriteAllText(reportPath, report.ToString());
            }
        }
    }

    class DiscordInstall
    {
        public string Name;
        public string Root;
        public string ProcessName;
        public string Resources;
        public bool Patched;
    }

    class ReleaseFile
    {
        public string Url;
        public long Size;
        public string Sha256;
    }

    static class Installer
    {
        public const string Repo = "1223321313333/Nightcord";
        const string ReleaseTag = "devbuild";
        const string AsarName = "desktop.asar";
        const string UserAgent = "NightcordInstaller/1.1 (+https://github.com/" + Repo + ")";

        public static readonly string DataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Nightcord");
        public static string AsarPath { get { return Path.Combine(DataDir, AsarName); } }

        static readonly string[][] Flavours =
        {
            new[] { "Discord", "Discord" },
            new[] { "Discord PTB", "DiscordPTB" },
            new[] { "Discord Canary", "DiscordCanary" },
        };

        public static List<DiscordInstall> FindInstalls()
        {
            var result = new List<DiscordInstall>();
            string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);

            foreach (var flavour in Flavours)
            {
                string root = Path.Combine(local, flavour[1]);
                if (!Directory.Exists(root)) continue;

                // The newest app-x.y.z folder is the one Discord runs
                string newest = null;
                Version newestVersion = null;
                foreach (string dir in Directory.GetDirectories(root, "app-*"))
                {
                    Version v;
                    if (!Version.TryParse(Path.GetFileName(dir).Substring(4), out v)) continue;
                    if (newestVersion == null || v > newestVersion)
                    {
                        newestVersion = v;
                        newest = dir;
                    }
                }
                if (newest == null) continue;

                string resources = Path.Combine(newest, "resources");
                if (!Directory.Exists(resources)) continue;

                result.Add(new DiscordInstall
                {
                    Name = flavour[0],
                    Root = root,
                    ProcessName = flavour[1],
                    Resources = resources,
                    Patched = File.Exists(Path.Combine(resources, "_app.asar"))
                });
            }
            return result;
        }

        static WebClient NewClient()
        {
            var client = new WebClient();
            client.Headers[HttpRequestHeader.UserAgent] = UserAgent;
            return client;
        }

        /// <summary>Where to download desktop.asar from and the SHA-256 it must have</summary>
        public static ReleaseFile GetRelease()
        {
            string downloadUrl = "https://github.com/" + Repo + "/releases/download/" + ReleaseTag + "/" + AsarName;

            try
            {
                using (var client = NewClient())
                {
                    client.Headers[HttpRequestHeader.Accept] = "application/vnd.github+json";
                    string json = client.DownloadString("https://api.github.com/repos/" + Repo + "/releases/tags/" + ReleaseTag);
                    var release = (Dictionary<string, object>)new JavaScriptSerializer { MaxJsonLength = int.MaxValue }.DeserializeObject(json);

                    foreach (var item in (IEnumerable)release["assets"])
                    {
                        var asset = (Dictionary<string, object>)item;
                        if ((string)asset["name"] != AsarName) continue;

                        object digest;
                        asset.TryGetValue("digest", out digest);
                        string sha = digest as string;
                        if (sha != null && sha.StartsWith("sha256:")) sha = sha.Substring(7).ToLowerInvariant();
                        else sha = null;

                        var file = new ReleaseFile
                        {
                            Url = (string)asset["browser_download_url"],
                            Size = Convert.ToInt64(asset["size"]),
                            Sha256 = sha
                        };
                        if (file.Sha256 == null) file.Sha256 = GetChecksumFile(file.Url);
                        return file;
                    }
                    throw new InvalidOperationException("В последнем релизе Nightcord нет файла " + AsarName + ".");
                }
            }
            catch (WebException)
            {
                // The GitHub API allows 60 requests per hour per IP; the download links have no such limit
                return new ReleaseFile { Url = downloadUrl, Size = -1, Sha256 = GetChecksumFile(downloadUrl) };
            }
        }

        static string GetChecksumFile(string asarUrl)
        {
            using (var client = NewClient())
            {
                string text = client.DownloadString(asarUrl + ".sha256");
                Match m = Regex.Match(text, @"\b[a-fA-F0-9]{64}\b");
                if (!m.Success) throw new InvalidOperationException("Не удалось получить контрольную сумму сборки, установка отменена.");
                return m.Value.ToLowerInvariant();
            }
        }

        /// <summary>Downloads to a temporary file and returns its path once the SHA-256 matches</summary>
        public static string Download(ReleaseFile file, Action<long, long> progress)
        {
            string temp = Path.Combine(Path.GetTempPath(), "nightcord-" + Guid.NewGuid().ToString("N") + ".asar");
            var request = (HttpWebRequest)WebRequest.Create(file.Url);
            request.UserAgent = UserAgent;
            request.Timeout = 30000;
            request.ReadWriteTimeout = 30000;
            request.AllowAutoRedirect = true;

            try
            {
                using (var response = (HttpWebResponse)request.GetResponse())
                using (var input = response.GetResponseStream())
                using (var output = File.Create(temp))
                using (var sha = SHA256.Create())
                {
                    long total = response.ContentLength > 0 ? response.ContentLength : file.Size;
                    long done = 0;
                    var buffer = new byte[81920];
                    int read;
                    while ((read = input.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        output.Write(buffer, 0, read);
                        sha.TransformBlock(buffer, 0, read, null, 0);
                        done += read;
                        progress(done, total);
                    }
                    sha.TransformFinalBlock(new byte[0], 0, 0);

                    string actual = BitConverter.ToString(sha.Hash).Replace("-", "").ToLowerInvariant();
                    if (actual != file.Sha256)
                        throw new InvalidOperationException("Скачанная сборка повреждена или подменена (SHA-256 не совпадает). Ничего не установлено, попробуйте ещё раз.");
                    if (done < 16)
                        throw new InvalidOperationException("Скачанная сборка пустая. Ничего не установлено, попробуйте ещё раз.");
                }

                using (var check = File.OpenRead(temp))
                {
                    var header = new byte[4];
                    if (check.Read(header, 0, 4) != 4 || BitConverter.ToUInt32(header, 0) != 4)
                        throw new InvalidOperationException("Скачанный файл не похож на сборку Nightcord. Ничего не установлено.");
                }
                return temp;
            }
            catch
            {
                TryDelete(temp);
                throw;
            }
        }

        public static void TryDelete(string path)
        {
            try { if (path != null && File.Exists(path)) File.Delete(path); }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }

        /// <summary>Puts the verified download in place of %APPDATA%\Nightcord\desktop.asar</summary>
        public static void PlaceAsar(string verifiedTemp)
        {
            Directory.CreateDirectory(DataDir);
            string staged = AsarPath + ".new";
            File.Copy(verifiedTemp, staged, true);
            Retry(delegate
            {
                if (File.Exists(AsarPath)) File.Replace(staged, AsarPath, null);
                else File.Move(staged, AsarPath);
            });
        }

        /// <summary>A tiny asar archive whose index.js loads Nightcord</summary>
        public static byte[] BuildLoaderAsar(string target)
        {
            var utf8 = new UTF8Encoding(false);
            string escaped = target.Replace("\\", "\\\\").Replace("\"", "\\\"");
            byte[] js = utf8.GetBytes("require(\"" + escaped + "\")");
            byte[] pkg = utf8.GetBytes("{\"name\":\"discord\",\"main\":\"index.js\"}");
            byte[] json = utf8.GetBytes("{\"files\":{\"index.js\":{\"size\":" + js.Length + ",\"offset\":\"0\"},\"package.json\":{\"size\":" + pkg.Length + ",\"offset\":\"" + js.Length + "\"}}}");
            int pad = (4 - json.Length % 4) % 4;
            int payload = 4 + json.Length + pad;

            using (var ms = new MemoryStream())
            using (var w = new BinaryWriter(ms))
            {
                w.Write((uint)4);
                w.Write((uint)(payload + 4));
                w.Write((uint)payload);
                w.Write((uint)json.Length);
                w.Write(json);
                w.Write(new byte[pad]);
                w.Write(js);
                w.Write(pkg);
                w.Flush();
                return ms.ToArray();
            }
        }

        public static void Inject(DiscordInstall install)
        {
            string asar = Path.Combine(install.Resources, "app.asar");
            string backup = Path.Combine(install.Resources, "_app.asar");

            // First install: keep Discord's own app.asar as _app.asar
            if (!File.Exists(backup))
            {
                if (!File.Exists(asar)) throw new InvalidOperationException(install.Name + ": не найден app.asar, переустановите Discord.");
                Retry(delegate { File.Move(asar, backup); });
            }

            byte[] loader = BuildLoaderAsar(AsarPath);
            Retry(delegate { File.WriteAllBytes(asar, loader); });
            install.Patched = true;
        }

        public static void Restore(DiscordInstall install)
        {
            string asar = Path.Combine(install.Resources, "app.asar");
            string backup = Path.Combine(install.Resources, "_app.asar");
            if (!File.Exists(backup)) return;

            Retry(delegate
            {
                if (File.Exists(asar)) File.Delete(asar);
                File.Move(backup, asar);
            });
            install.Patched = false;
        }

        /// <summary>Discord keeps files open for a moment after its processes exit</summary>
        static void Retry(Action action)
        {
            for (int attempt = 1; ; attempt++)
            {
                try
                {
                    action();
                    return;
                }
                catch (IOException)
                {
                    if (attempt >= 10) throw;
                }
                catch (UnauthorizedAccessException)
                {
                    if (attempt >= 10) throw;
                }
                Thread.Sleep(300);
            }
        }

        public static List<DiscordInstall> Running(IEnumerable<DiscordInstall> installs)
        {
            return installs.Where(i => Process.GetProcessesByName(i.ProcessName).Length > 0).ToList();
        }

        public static void Close(IEnumerable<DiscordInstall> installs)
        {
            foreach (var install in installs)
            {
                foreach (var p in Process.GetProcessesByName(install.ProcessName))
                {
                    try
                    {
                        p.Kill();
                        p.WaitForExit(5000);
                    }
                    catch (InvalidOperationException) { }
                    catch (System.ComponentModel.Win32Exception) { }
                }
            }
            Thread.Sleep(1000);
        }

        public static void Start(DiscordInstall install)
        {
            string update = Path.Combine(install.Root, "Update.exe");
            if (File.Exists(update)) Process.Start(update, "--processStart " + install.ProcessName + ".exe");
        }
    }

    static class Palette
    {
        public static readonly Color Background = Color.FromArgb(19, 17, 28);
        public static readonly Color Surface = Color.FromArgb(29, 26, 41);
        public static readonly Color SurfaceHover = Color.FromArgb(39, 35, 55);
        public static readonly Color Border = Color.FromArgb(52, 47, 72);
        public static readonly Color Accent = Color.FromArgb(139, 92, 246);
        public static readonly Color AccentHover = Color.FromArgb(157, 118, 250);
        public static readonly Color Text = Color.FromArgb(236, 233, 245);
        public static readonly Color Muted = Color.FromArgb(155, 150, 176);
        public static readonly Color Success = Color.FromArgb(74, 222, 128);
        public static readonly Color Warning = Color.FromArgb(251, 191, 36);
        public static readonly Color Error = Color.FromArgb(248, 113, 113);
    }

    /// <summary>The Nightcord crescent moon</summary>
    class MoonLogo : Control
    {
        public MoonLogo()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint | ControlStyles.SupportsTransparentBackColor, true);
            BackColor = Color.Transparent;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            var g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            float s = Math.Min(Width, Height) - 2;
            using (var moon = new GraphicsPath())
            using (var bite = new GraphicsPath())
            {
                moon.AddEllipse(1, 1, s, s);
                bite.AddEllipse(1 + s * 0.32f, 1 - s * 0.12f, s * 0.9f, s * 0.9f);
                using (var region = new Region(moon))
                {
                    region.Exclude(bite);
                    using (var brush = new LinearGradientBrush(new PointF(0, 0), new PointF(s, s), Palette.AccentHover, Palette.Accent))
                        g.FillRegion(brush, region);
                }
            }
        }
    }

    /// <summary>A flat progress bar in the accent colour</summary>
    class Bar : Control
    {
        double value;
        public double Value
        {
            get { return value; }
            set { this.value = Math.Max(0, Math.Min(1, value)); Invalidate(); }
        }

        public Bar()
        {
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.UserPaint, true);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.Clear(Palette.Surface);
            int w = (int)Math.Round(Width * value);
            if (w > 0)
                using (var b = new SolidBrush(Palette.Accent))
                    e.Graphics.FillRectangle(b, 0, 0, w, Height);
        }
    }

    class FlatButtonEx : Button
    {
        public FlatButtonEx(string text, bool primary)
        {
            Text = text;
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = primary ? 0 : 1;
            FlatAppearance.BorderColor = Palette.Border;
            BackColor = primary ? Palette.Accent : Palette.Surface;
            FlatAppearance.MouseOverBackColor = primary ? Palette.AccentHover : Palette.SurfaceHover;
            FlatAppearance.MouseDownBackColor = primary ? Palette.Accent : Palette.Border;
            ForeColor = Color.White;
            Font = new Font("Segoe UI", 10f, primary ? FontStyle.Bold : FontStyle.Regular);
            Cursor = Cursors.Hand;
            Height = 38;
            UseVisualStyleBackColor = false;
        }
    }

    class MainForm : Form
    {
        readonly FlowLayoutPanel installList;
        readonly Button installButton;
        readonly Button uninstallButton;
        readonly Bar bar;
        readonly Label status;
        readonly TextBox log;
        readonly Dictionary<DiscordInstall, CheckBox> checks = new Dictionary<DiscordInstall, CheckBox>();
        List<DiscordInstall> installs = new List<DiscordInstall>();
        bool busy;

        public MainForm()
        {
            Text = "Установщик Nightcord";
            ClientSize = new Size(560, 520);
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Palette.Background;
            ForeColor = Palette.Text;
            Font = new Font("Segoe UI", 9.75f);
            AutoScaleMode = AutoScaleMode.Font;
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); }
            catch (ArgumentException) { }

            var logo = new MoonLogo { Location = new Point(28, 26), Size = new Size(48, 48) };
            var title = new Label { Text = "Nightcord", Font = new Font("Segoe UI", 20f, FontStyle.Bold), AutoSize = true, Location = new Point(88, 22), ForeColor = Palette.Text };
            var subtitle = new Label { Text = "Клиентский мод для Discord: темы, плагины, русский язык", AutoSize = true, Location = new Point(91, 58), ForeColor = Palette.Muted };

            var listTitle = new Label { Text = "Куда установить", Font = new Font("Segoe UI", 10.5f, FontStyle.Bold), AutoSize = true, Location = new Point(28, 104), ForeColor = Palette.Text };
            installList = new FlowLayoutPanel
            {
                Location = new Point(28, 132),
                Size = new Size(504, 128),
                FlowDirection = FlowDirection.TopDown,
                WrapContents = false,
                BackColor = Palette.Surface,
                Padding = new Padding(12, 8, 12, 8),
                AutoScroll = true
            };

            installButton = new FlatButtonEx("Установить", true) { Location = new Point(28, 278), Width = 244 };
            uninstallButton = new FlatButtonEx("Удалить Nightcord", false) { Location = new Point(288, 278), Width = 244 };
            installButton.Click += delegate { RunInstall(); };
            uninstallButton.Click += delegate { RunUninstall(); };

            bar = new Bar { Location = new Point(28, 332), Size = new Size(504, 6) };
            status = new Label { Location = new Point(28, 346), Size = new Size(504, 40), ForeColor = Palette.Muted, Text = "" };

            log = new TextBox
            {
                Location = new Point(28, 390),
                Size = new Size(504, 86),
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.None,
                BorderStyle = BorderStyle.None,
                BackColor = Palette.Surface,
                ForeColor = Palette.Muted,
                Font = new Font("Consolas", 8.75f)
            };

            var link = new LinkLabel
            {
                Text = "github.com/" + Installer.Repo,
                AutoSize = true,
                Location = new Point(25, 488),
                LinkColor = Palette.Accent,
                ActiveLinkColor = Palette.AccentHover,
                VisitedLinkColor = Palette.Accent
            };
            link.LinkClicked += delegate { Process.Start("https://github.com/" + Installer.Repo); };
            var version = new Label
            {
                Text = "установщик " + Assembly.GetExecutingAssembly().GetName().Version.ToString(3),
                AutoSize = true,
                ForeColor = Palette.Muted,
                Location = new Point(420, 488)
            };

            Controls.AddRange(new Control[] { logo, title, subtitle, listTitle, installList, installButton, uninstallButton, bar, status, log, link, version });
            AcceptButton = installButton;
            Shown += delegate { Reload(true); };
        }

        [System.Runtime.InteropServices.DllImport("dwmapi.dll")]
        static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            // Dark title bar to match the window (Windows 10 20H1+ and 11; silently ignored elsewhere)
            try
            {
                int dark = 1;
                if (DwmSetWindowAttribute(Handle, 20, ref dark, sizeof(int)) != 0)
                    DwmSetWindowAttribute(Handle, 19, ref dark, sizeof(int));
            }
            catch (DllNotFoundException) { }
            catch (EntryPointNotFoundException) { }
        }

        void Log(string text)
        {
            if (InvokeRequired) { BeginInvoke((Action)(() => Log(text))); return; }
            log.AppendText((log.TextLength > 0 ? Environment.NewLine : "") + DateTime.Now.ToString("HH:mm:ss") + "  " + text);
        }

        void SetStatus(string text, Color color)
        {
            if (InvokeRequired) { BeginInvoke((Action)(() => SetStatus(text, color))); return; }
            status.Text = text;
            status.ForeColor = color;
        }

        void SetProgress(double value)
        {
            if (InvokeRequired) { BeginInvoke((Action)(() => SetProgress(value))); return; }
            bar.Value = value;
        }

        void Reload(bool first)
        {
            installs = Installer.FindInstalls();
            installList.Controls.Clear();
            checks.Clear();

            if (installs.Count == 0)
            {
                installList.Controls.Add(new Label
                {
                    Text = "Discord не найден. Установите его с discord.com и запустите установщик снова.",
                    AutoSize = false,
                    Size = new Size(470, 44),
                    ForeColor = Palette.Warning
                });
            }

            foreach (var install in installs)
            {
                var check = new CheckBox
                {
                    Text = install.Name + (install.Patched ? "  —  Nightcord установлен" : "  —  без Nightcord"),
                    Checked = true,
                    AutoSize = true,
                    ForeColor = install.Patched ? Palette.Success : Palette.Text,
                    Margin = new Padding(0, 6, 0, 6),
                    Cursor = Cursors.Hand
                };
                check.CheckedChanged += delegate { UpdateButtons(); };
                checks[install] = check;
                installList.Controls.Add(check);
            }

            UpdateButtons();
            if (first)
            {
                if (installs.Count > 0) SetStatus("Выберите Discord и нажмите «" + installButton.Text + "». Установка занимает меньше минуты.", Palette.Muted);
                Log("Найдено Discord: " + installs.Count + (installs.Count > 0 ? " (" + string.Join(", ", installs.Select(i => i.Name).ToArray()) + ")" : ""));
            }
        }

        List<DiscordInstall> Selected()
        {
            return installs.Where(i => checks.ContainsKey(i) && checks[i].Checked).ToList();
        }

        void UpdateButtons()
        {
            var selected = Selected();
            installButton.Text = selected.Count > 0 && selected.All(i => i.Patched) ? "Обновить" : "Установить";
            installButton.Enabled = !busy && selected.Count > 0;
            uninstallButton.Enabled = !busy && selected.Any(i => i.Patched);
            installButton.BackColor = installButton.Enabled ? Palette.Accent : Palette.Border;
            uninstallButton.ForeColor = uninstallButton.Enabled ? Color.White : Palette.Muted;
            foreach (var c in checks.Values) c.Enabled = !busy;
        }

        void SetBusy(bool value)
        {
            if (InvokeRequired) { BeginInvoke((Action)(() => SetBusy(value))); return; }
            busy = value;
            UseWaitCursor = value;
            UpdateButtons();
        }

        /// <summary>Asks to close the selected Discords if they are running. Returns the ones that were closed, or null to cancel.</summary>
        List<DiscordInstall> CloseDiscord(List<DiscordInstall> selected)
        {
            var running = Installer.Running(selected);
            if (running.Count == 0) return running;

            string names = string.Join(", ", running.Select(i => i.Name).ToArray());
            var answer = (DialogResult)Invoke((Func<DialogResult>)(() => MessageBox.Show(this,
                names + " сейчас открыт. Его нужно закрыть, после установки он запустится снова.\n\nЗакрыть сейчас?",
                "Nightcord", MessageBoxButtons.OKCancel, MessageBoxIcon.Question)));
            if (answer != DialogResult.OK) return null;

            Log("Закрываю " + names);
            Installer.Close(running);
            return running;
        }

        void RunInBackground(Action work)
        {
            SetBusy(true);
            var thread = new Thread(() =>
            {
                try
                {
                    work();
                }
                catch (Exception ex)
                {
                    string message = ex is WebException ? "Нет связи с GitHub: " + ex.Message + " Проверьте интернет и попробуйте ещё раз." : ex.Message;
                    Log("Ошибка: " + ex.GetType().Name + ": " + ex.Message);
                    SetStatus(message, Palette.Error);
                    SetProgress(0);
                }
                finally
                {
                    SetBusy(false);
                    BeginInvoke((Action)(() => Reload(false)));
                }
            });
            thread.IsBackground = true;
            thread.Start();
        }

        void RunInstall()
        {
            var selected = Selected();
            if (selected.Count == 0) return;

            RunInBackground(() =>
            {
                SetProgress(0);
                SetStatus("Узнаю, какая версия Nightcord последняя…", Palette.Muted);
                var release = Installer.GetRelease();
                Log("Сборка: " + release.Url);
                Log("Ожидаемый SHA-256: " + release.Sha256);

                SetStatus("Скачиваю Nightcord…", Palette.Muted);
                string temp = Installer.Download(release, (done, total) =>
                {
                    if (total > 0)
                    {
                        SetProgress((double)done / total * 0.9);
                        SetStatus(string.Format("Скачиваю Nightcord… {0:0.0} из {1:0.0} МБ", done / 1048576.0, total / 1048576.0), Palette.Muted);
                    }
                });
                Log("Сборка скачана, SHA-256 совпадает");

                try
                {
                    var closed = CloseDiscord(selected);
                    if (closed == null)
                    {
                        SetStatus("Установка отменена: Discord нужно закрыть.", Palette.Warning);
                        SetProgress(0);
                        return;
                    }

                    SetStatus("Устанавливаю…", Palette.Muted);
                    Installer.PlaceAsar(temp);
                    Log("Nightcord сохранён в " + Installer.AsarPath);
                    foreach (var install in selected)
                    {
                        Installer.Inject(install);
                        Log("Установлен в " + install.Name + " (" + install.Resources + ")");
                    }
                    SetProgress(1);

                    foreach (var install in closed) Installer.Start(install);
                    SetStatus("Готово! Откройте Discord: в настройках появится раздел Nightcord." + (closed.Count > 0 ? " Discord уже запускается." : ""), Palette.Success);
                }
                finally
                {
                    Installer.TryDelete(temp);
                }
            });
        }

        void RunUninstall()
        {
            var selected = Selected().Where(i => i.Patched).ToList();
            if (selected.Count == 0) return;

            RunInBackground(() =>
            {
                SetProgress(0);
                var closed = CloseDiscord(selected);
                if (closed == null)
                {
                    SetStatus("Удаление отменено: Discord нужно закрыть.", Palette.Warning);
                    return;
                }

                foreach (var install in selected)
                {
                    Installer.Restore(install);
                    Log("Удалён из " + install.Name);
                }
                SetProgress(1);
                foreach (var install in closed) Installer.Start(install);
                SetStatus("Nightcord удалён, Discord восстановлен. Настройки остались в " + Installer.DataDir + ".", Palette.Success);
            });
        }
    }
}
