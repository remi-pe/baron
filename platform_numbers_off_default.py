#!/usr/bin/env python3
"""
Set platform numbers to OFF by default
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# Change platform numbers default to false
content = content.replace(
    'const [showPlatformNumbers, setShowPlatformNumbers] = useState(true)',
    'const [showPlatformNumbers, setShowPlatformNumbers] = useState(false)'
)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Successfully set platform numbers to OFF by default")
print("  - Users can toggle them ON via Dev Tools if needed")
