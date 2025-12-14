print("Importing rembg...")
try:
    from rembg import remove
    print("Import successful")
except Exception as e:
    print(f"Import failed: {e}")
