import bcrypt

# Test the hash from the database
hash_str = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S'
hash_bytes = hash_str.encode()
print('Hash from DB:', repr(hash_str))
print('Test demo123:', bcrypt.checkpw(b'demo123', hash_bytes))

# Generate a new hash for demo123
new_hash = bcrypt.hashpw(b'demo123', bcrypt.gensalt(12))
print('New hash for demo123:', new_hash.decode())
print('Test new hash:', bcrypt.checkpw(b'demo123', new_hash))