import os
import glob
import re

for filepath in glob.glob("routers/*.py"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace @router.get("/") with @router.get("")
    # and same for post, put, delete, patch
    new_content = re.sub(
        r'@router\.(get|post|put|delete|patch)\(\"\/\"',
        r'@router.\1("")',
        content
    )
    new_content = re.sub(
        r"@router\.(get|post|put|delete|patch)\(\'/\'",
        r"@router.\1('')",
        new_content
    )
    
    if new_content != content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Fixed {filepath}")
