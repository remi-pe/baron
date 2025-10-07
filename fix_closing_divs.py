#!/usr/bin/env python3
"""
Fix the closing div tags structure
"""

# Read the file
with open('Baron-web.tsx', 'r') as f:
    content = f.read()

# The issue is that we need TWO closing divs:
# 1. One to close the "flex flex-col items-center" (main game area)
# 2. One to close the "flex flex-row items-start justify-center" (outer container)

# Find the end pattern and fix it
old_end = """      )}

    </div>
  )
}"""

new_end = """      )}

      </div>
    </div>
  )
}"""

content = content.replace(old_end, new_end)

# Write back
with open('Baron-web.tsx', 'w') as f:
    f.write(content)

print("✅ Fixed closing div tags")
print("  - Added proper closing for main game area div")
print("  - Outer flex-row container now properly closed")

