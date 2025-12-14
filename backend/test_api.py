import requests
import sys

def test_remove_bg():
    url = "http://localhost:8000/remove-bg"
    # Create a dummy image for testing
    from PIL import Image
    import io
    
    img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr.seek(0)
    
    files = {'file': ('test.png', img_byte_arr, 'image/png')}
    
    try:
        response = requests.post(url, files=files)
        if response.status_code == 200:
            if response.headers['content-type'] == 'image/png':
                print("SUCCESS: API returned 200 and image/png")
                return True
            else:
                print(f"FAILURE: API returned {response.headers['content-type']}")
                return False
        else:
            print(f"FAILURE: API returned {response.status_code}")
            return False
    except Exception as e:
        print(f"ERROR: Could not connect to API: {e}")
        return False

if __name__ == "__main__":
    if test_remove_bg():
        sys.exit(0)
    else:
        sys.exit(1)
