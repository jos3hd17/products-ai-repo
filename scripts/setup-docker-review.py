#!/usr/bin/env python3
"""Create local review settings only; never overwrite existing credentials or print secrets."""
import os
from pathlib import Path
import secrets
root = Path(__file__).resolve().parents[1]
path = root / '.env.docker'
if path.exists():
    print('Existing .env.docker retained; no credentials changed.')
else:
    content = ('WEB_PORT=8080\nDEMO_USER_EMAIL=review@example.test\n'
               + 'DEMO_USER_PASSWORD=' + secrets.token_urlsafe(24) + '\n'
               + 'JWT_SECRET=' + secrets.token_urlsafe(48) + '\n')
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as stream:
        stream.write(content)
    print('Created private .env.docker; open it locally for review login credentials.')
