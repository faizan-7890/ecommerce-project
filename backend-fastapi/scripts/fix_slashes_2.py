import os
import glob

for filepath in glob.glob("../routers/*.py"):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    content = content.replace('@router.get(""),', '@router.get("",')
    content = content.replace('@router.post(""),', '@router.post("",')
    content = content.replace('@router.put(""),', '@router.put("",')
    content = content.replace('@router.delete(""),', '@router.delete("",')
    content = content.replace('@router.patch(""),', '@router.patch("",')
    
    content = content.replace('@router.get(""))', '@router.get("")')
    content = content.replace('@router.post(""))', '@router.post("")')
    content = content.replace('@router.put(""))', '@router.put("")')
    content = content.replace('@router.delete(""))', '@router.delete("")')
    content = content.replace('@router.patch(""))', '@router.patch("")')

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
