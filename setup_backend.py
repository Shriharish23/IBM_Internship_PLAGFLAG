#!/usr/bin/env python3
"""Setup script: Creates venv and installs all backend dependencies."""
import subprocess
import sys
import os


def run(cmd, **kwargs):
    print(f"  >> {' '.join(cmd)}")
    result = subprocess.run(cmd, **kwargs)
    if result.returncode != 0:
        print(f"ERROR: Command failed with code {result.returncode}")
        sys.exit(1)
    return result


def main():
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    os.chdir(backend_dir)

    print("\n=== PLAGFLAG Backend Setup ===\n")

    # Create venv
    if not os.path.exists('venv'):
        print("[1/4] Creating virtual environment...")
        run([sys.executable, '-m', 'venv', 'venv'])
    else:
        print("[1/4] Virtual environment already exists.")

    # Determine pip path
    if sys.platform == 'win32':
        pip = os.path.join('venv', 'Scripts', 'pip.exe')
        python = os.path.join('venv', 'Scripts', 'python.exe')
    else:
        pip = os.path.join('venv', 'bin', 'pip')
        python = os.path.join('venv', 'bin', 'python')

    print("[2/4] Upgrading pip...")
    run([pip, 'install', '--upgrade', 'pip'], capture_output=True)

    print("[3/4] Installing requirements...")
    run([pip, 'install', '-r', 'requirements.txt'])

    print("[4/4] Downloading NLTK data...")
    run([python, '-c', "import nltk; nltk.download('punkt', quiet=True); nltk.download('stopwords', quiet=True); nltk.download('punkt_tab', quiet=True)"])

    # Copy .env if not exists
    if not os.path.exists('.env') and os.path.exists('.env.example'):
        import shutil
        shutil.copy('.env.example', '.env')
        print("\n✅ Created backend/.env — Add your IBM credentials to enable IBM Granite AI detection.")

    print("\n✅ Backend setup complete!")
    print("\nTo start the backend:")
    if sys.platform == 'win32':
        print("  cd backend && venv\\Scripts\\activate && python app.py")
    else:
        print("  cd backend && source venv/bin/activate && python app.py")


if __name__ == '__main__':
    main()
