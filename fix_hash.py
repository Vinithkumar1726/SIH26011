import bcrypt
import subprocess

# Generate a proper bcrypt hash for 'demo123'
new_hash = bcrypt.hashpw(b'demo123', bcrypt.gensalt(12))
print('New hash:', new_hash.decode())
print('Test:', bcrypt.checkpw(b'demo123', new_hash))

# Update the database using psql with the new hash
hash_str = new_hash.decode()
cmd = f"UPDATE app_user SET password_hash = '{hash_str}', last_login = NULL, is_active = TRUE WHERE username IN ('admin', 'rajesh.k', 'priya.s', 'amit.p');"

result = subprocess.run(['psql', '-h', 'localhost', '-U', 'postgres', '-d', 'sih26011', '-c', cmd], capture_output=True, text=True)
print('stdout:', result.stdout)
print('stderr:', result.stderr)
print('returncode:', result.returncode)