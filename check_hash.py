import bcrypt
import subprocess

result = subprocess.run(['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'sih26011', '-c', "SELECT password_hash FROM app_user WHERE username = 'admin';", '-t'], capture_output=True, text=True)
hash_str = result.stdout.strip()
print('Hash from DB:', repr(hash_str))
hash_bytes = hash_str.encode()
print('Test demo123:', bcrypt.checkpw(b'demo123', hash_bytes))