import os
import glob

for filepath in glob.glob("routers/*.py"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Fix the syntax error I introduced: @router.get(""), -> @router.get("",
    content = content.replace('@router.get(""),', '@router.get("",')
    content = content.replace('@router.post(""),', '@router.post("",')
    content = content.replace('@router.put(""),', '@router.put("",')
    content = content.replace('@router.delete(""),', '@router.delete("",')
    content = content.replace('@router.patch(""),', '@router.patch("",')
    
    # What if it was @router.get("")\n or similar without a comma?
    # It would have been @router.get("/") originally, which became @router.get("")
    # Wait, the original was @router.get("/"). 
    # My regex replaced `@router.get("/"` with `@router.get("")`.
    # So `@router.get("/")` became `@router.get(""))`.
    content = content.replace('@router.get(""))', '@router.get("")')
    content = content.replace('@router.post(""))', '@router.post("")')
    content = content.replace('@router.put(""))', '@router.put("")')
    content = content.replace('@router.delete(""))', '@router.delete("")')
    content = content.replace('@router.patch(""))', '@router.patch("")')

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
