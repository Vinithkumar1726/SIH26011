# Delete existing task
schtasks /delete /tn "SIH26011Backend" /f

# Create new task that runs python.exe directly
$command = 'cmd.exe /c cd /d "C:\Users\Vivekkumar\Desktop\vinith\SIH26011\SIH26011-enhanced-full-pass\backend" && "C:\Users\Vivekkumar\AppData\Local\Programs\Python\Python312\python.exe" -m uvicorn app:app --host 0.0.0.0 --port 8000'

schtasks /create /tn "SIH26011Backend" `
    /tr $command `
    /sc onstart /rl highest /f