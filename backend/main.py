from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse
from rembg import remove
from PIL import Image, ImageEnhance, ImageFilter
import io
import base64
from typing import List
import numpy as np
import cv2
import os
import urllib.request

app = FastAPI(title="SpaceIT API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Constants
MAX_BATCH_FILES = 20
MAX_UPSCALE = 10
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")

# Global variable for AI upscaler
_ai_upscaler = None

def download_model():
    """Download Real-ESRGAN model weights"""
    os.makedirs(MODEL_DIR, exist_ok=True)
    model_path = os.path.join(MODEL_DIR, "RealESRGAN_x4plus.pth")
    
    if not os.path.exists(model_path):
        print("Downloading Real-ESRGAN model (this may take a while)...")
        url = "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth"
        try:
            urllib.request.urlretrieve(url, model_path)
            print("Model downloaded successfully!")
        except Exception as e:
            print(f"Failed to download model: {e}")
            return None
    
    return model_path

def get_ai_upscaler():
    """Get or initialize AI upscaler using PyTorch"""
    global _ai_upscaler
    
    if _ai_upscaler is None:
        try:
            import torch
            
            # Check if we have the model
            model_path = download_model()
            if model_path is None:
                _ai_upscaler = "fallback"
                return _ai_upscaler
            
            # Define RRDBNet architecture (Real-ESRGAN uses this)
            class ResidualDenseBlock(torch.nn.Module):
                def __init__(self, nf=64, gc=32):
                    super().__init__()
                    self.conv1 = torch.nn.Conv2d(nf, gc, 3, 1, 1)
                    self.conv2 = torch.nn.Conv2d(nf + gc, gc, 3, 1, 1)
                    self.conv3 = torch.nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
                    self.conv4 = torch.nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
                    self.conv5 = torch.nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
                    self.lrelu = torch.nn.LeakyReLU(0.2, True)

                def forward(self, x):
                    x1 = self.lrelu(self.conv1(x))
                    x2 = self.lrelu(self.conv2(torch.cat((x, x1), 1)))
                    x3 = self.lrelu(self.conv3(torch.cat((x, x1, x2), 1)))
                    x4 = self.lrelu(self.conv4(torch.cat((x, x1, x2, x3), 1)))
                    x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
                    return x5 * 0.2 + x

            class RRDB(torch.nn.Module):
                def __init__(self, nf):
                    super().__init__()
                    self.rdb1 = ResidualDenseBlock(nf)
                    self.rdb2 = ResidualDenseBlock(nf)
                    self.rdb3 = ResidualDenseBlock(nf)

                def forward(self, x):
                    out = self.rdb1(x)
                    out = self.rdb2(out)
                    out = self.rdb3(out)
                    return out * 0.2 + x

            class RRDBNet(torch.nn.Module):
                def __init__(self, in_nc=3, out_nc=3, nf=64, nb=23, scale=4):
                    super().__init__()
                    self.scale = scale
                    self.conv_first = torch.nn.Conv2d(in_nc, nf, 3, 1, 1)
                    self.body = torch.nn.Sequential(*[RRDB(nf) for _ in range(nb)])
                    self.conv_body = torch.nn.Conv2d(nf, nf, 3, 1, 1)
                    # Upsampling
                    self.conv_up1 = torch.nn.Conv2d(nf, nf, 3, 1, 1)
                    self.conv_up2 = torch.nn.Conv2d(nf, nf, 3, 1, 1)
                    self.conv_hr = torch.nn.Conv2d(nf, nf, 3, 1, 1)
                    self.conv_last = torch.nn.Conv2d(nf, out_nc, 3, 1, 1)
                    self.lrelu = torch.nn.LeakyReLU(0.2, True)

                def forward(self, x):
                    fea = self.conv_first(x)
                    body_fea = self.conv_body(self.body(fea))
                    fea = fea + body_fea
                    # Upsampling
                    fea = self.lrelu(self.conv_up1(torch.nn.functional.interpolate(fea, scale_factor=2, mode='nearest')))
                    fea = self.lrelu(self.conv_up2(torch.nn.functional.interpolate(fea, scale_factor=2, mode='nearest')))
                    out = self.conv_last(self.lrelu(self.conv_hr(fea)))
                    return out

            # Load model
            model = RRDBNet(in_nc=3, out_nc=3, nf=64, nb=23, scale=4)
            state_dict = torch.load(model_path, map_location='cpu', weights_only=True)
            
            # Handle different state dict formats
            if 'params_ema' in state_dict:
                state_dict = state_dict['params_ema']
            elif 'params' in state_dict:
                state_dict = state_dict['params']
            
            model.load_state_dict(state_dict, strict=True)
            model.eval()
            
            _ai_upscaler = model
            print("Real-ESRGAN AI model loaded successfully!")
            
        except Exception as e:
            print(f"Failed to load AI upscaler: {e}")
            import traceback
            traceback.print_exc()
            _ai_upscaler = "fallback"
    
    return _ai_upscaler

def image_to_bytes(image: Image.Image, format: str = "PNG", quality: int = 95) -> bytes:
    """Convert PIL Image to bytes"""
    buffer = io.BytesIO()
    if format.upper() == "JPEG":
        if image.mode in ('RGBA', 'LA', 'P'):
            image = image.convert('RGB')
        image.save(buffer, format=format.upper(), quality=quality, optimize=True)
    elif format.upper() == "WEBP":
        image.save(buffer, format="WEBP", quality=quality, optimize=True)
    else:
        image.save(buffer, format="PNG", optimize=True)
    buffer.seek(0)
    return buffer.getvalue()

def ai_upscale_image(image: Image.Image, target_scale: float) -> Image.Image:
    """Upscale image using Real-ESRGAN AI model"""
    import torch
    
    upscaler = get_ai_upscaler()
    
    if upscaler == "fallback" or upscaler is None:
        return fallback_upscale(image, target_scale)
    
    try:
        # Handle alpha channel
        has_alpha = image.mode == 'RGBA'
        if has_alpha:
            r, g, b, a = image.split()
            rgb_image = Image.merge('RGB', (r, g, b))
            alpha_image = a
        else:
            rgb_image = image.convert('RGB')
            alpha_image = None
        
        # Convert to tensor
        img_np = np.array(rgb_image).astype(np.float32) / 255.0
        img_tensor = torch.from_numpy(img_np).permute(2, 0, 1).unsqueeze(0)
        
        # Process with AI model (4x upscale per pass)
        current_tensor = img_tensor
        current_scale = 1.0
        
        with torch.no_grad():
            while current_scale < target_scale:
                current_tensor = upscaler(current_tensor)
                current_scale *= 4
                
                # If we've reached or exceeded target, stop
                if current_scale >= target_scale:
                    break
        
        # Convert back to image
        output = current_tensor.squeeze(0).permute(1, 2, 0).clamp(0, 1).numpy()
        output = (output * 255).astype(np.uint8)
        result = Image.fromarray(output)
        
        # Resize to exact target scale if needed
        original_size = rgb_image.size
        target_size = (int(original_size[0] * target_scale), int(original_size[1] * target_scale))
        if result.size != target_size:
            result = result.resize(target_size, Image.Resampling.LANCZOS)
        
        # Restore alpha channel
        if alpha_image is not None:
            alpha_upscaled = alpha_image.resize(result.size, Image.Resampling.LANCZOS)
            result.putalpha(alpha_upscaled)
        
        return result
        
    except Exception as e:
        print(f"AI upscale error: {e}")
        import traceback
        traceback.print_exc()
        return fallback_upscale(image, target_scale)

def fallback_upscale(image: Image.Image, scale: float) -> Image.Image:
    """High quality fallback upscaling using Lanczos"""
    if scale <= 1:
        return image
    
    new_width = int(image.width * scale)
    new_height = int(image.height * scale)
    
    result = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    # Subtle sharpening
    result = result.filter(ImageFilter.UnsharpMask(radius=1, percent=50, threshold=3))
    
    return result

@app.get("/")
def read_root():
    upscaler = get_ai_upscaler()
    return {
        "message": "SpaceIT API is running",
        "ai_upscaler": "Real-ESRGAN" if upscaler != "fallback" and upscaler is not None else "Lanczos (fallback)",
        "endpoints": [
            "POST /remove-bg",
            "POST /upscale",
            "POST /edit",
            "POST /compress",
            "POST /batch"
        ]
    }

@app.post("/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    """Remove background from an image"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        input_image = await file.read()
        output_image = remove(input_image)
        return Response(content=output_image, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upscale")
async def upscale_image(
    file: UploadFile = File(...),
    scale: float = Form(default=2.0),
    use_ai: bool = Form(default=True)
):
    """Upscale image using AI (Real-ESRGAN) or traditional methods"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    scale = min(max(scale, 1), MAX_UPSCALE)

    try:
        input_bytes = await file.read()
        image = Image.open(io.BytesIO(input_bytes))
        
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGBA' if 'A' in image.mode else 'RGB')
        
        if use_ai:
            upscaled = ai_upscale_image(image, scale)
        else:
            upscaled = fallback_upscale(image, scale)
        
        output_bytes = image_to_bytes(upscaled)
        return Response(content=output_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/edit")
async def edit_image(
    file: UploadFile = File(...),
    brightness: float = Form(default=1.0),
    contrast: float = Form(default=1.0),
    saturation: float = Form(default=1.0),
    sharpness: float = Form(default=1.0),
    rotate: int = Form(default=0),
    flip_horizontal: bool = Form(default=False),
    flip_vertical: bool = Form(default=False)
):
    """Edit image with various adjustments"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        input_bytes = await file.read()
        image = Image.open(io.BytesIO(input_bytes))
        
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGBA')
        
        if brightness != 1.0:
            image = ImageEnhance.Brightness(image).enhance(brightness)
        if contrast != 1.0:
            image = ImageEnhance.Contrast(image).enhance(contrast)
        if saturation != 1.0:
            image = ImageEnhance.Color(image).enhance(saturation)
        if sharpness != 1.0:
            image = ImageEnhance.Sharpness(image).enhance(sharpness)
        if rotate != 0:
            image = image.rotate(-rotate, expand=True)
        if flip_horizontal:
            image = image.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if flip_vertical:
            image = image.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        
        output_bytes = image_to_bytes(image)
        return Response(content=output_bytes, media_type="image/png")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/compress")
async def compress_image(
    file: UploadFile = File(...),
    quality: int = Form(default=85),
    format: str = Form(default="jpeg")
):
    """Compress image with optimized settings"""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    quality = min(max(quality, 1), 100)
    format = format.lower()
    if format not in ["jpeg", "png", "webp"]:
        format = "jpeg"

    try:
        input_bytes = await file.read()
        image = Image.open(io.BytesIO(input_bytes))
        
        output_bytes = image_to_bytes(image, format=format, quality=quality)
        
        media_type = f"image/{format}" if format != "jpeg" else "image/jpeg"
        return Response(content=output_bytes, media_type=media_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/batch")
async def batch_process(
    files: List[UploadFile] = File(...),
    operation: str = Form(...),
    scale: float = Form(default=2.0),
    use_ai: bool = Form(default=True),
    brightness: float = Form(default=1.0),
    contrast: float = Form(default=1.0),
    saturation: float = Form(default=1.0),
    sharpness: float = Form(default=1.0),
    rotate: int = Form(default=0),
    quality: int = Form(default=85),
    format: str = Form(default="jpeg")
):
    """Batch process multiple images"""
    if len(files) > MAX_BATCH_FILES:
        raise HTTPException(status_code=400, detail=f"Maximum {MAX_BATCH_FILES} files allowed")
    
    if operation not in ["remove-bg", "upscale", "edit", "compress"]:
        raise HTTPException(status_code=400, detail="Invalid operation")

    try:
        results = []
        
        for i, file in enumerate(files):
            if not file.content_type.startswith("image/"):
                continue
            
            input_bytes = await file.read()
            output_bytes = None
            filename = file.filename or f"image_{i+1}"
            base_name = filename.rsplit('.', 1)[0]
            
            image = Image.open(io.BytesIO(input_bytes))
            
            if operation == "remove-bg":
                output_bytes = remove(input_bytes)
                ext = "png"
                mime_type = "image/png"
            
            elif operation == "upscale":
                if image.mode not in ('RGB', 'RGBA'):
                    image = image.convert('RGBA' if 'A' in image.mode else 'RGB')
                
                if use_ai:
                    upscaled = ai_upscale_image(image, min(scale, MAX_UPSCALE))
                else:
                    upscaled = fallback_upscale(image, min(scale, MAX_UPSCALE))
                
                output_bytes = image_to_bytes(upscaled)
                ext = "png"
                mime_type = "image/png"
            
            elif operation == "edit":
                if image.mode not in ('RGB', 'RGBA'):
                    image = image.convert('RGBA')
                
                if brightness != 1.0:
                    image = ImageEnhance.Brightness(image).enhance(brightness)
                if contrast != 1.0:
                    image = ImageEnhance.Contrast(image).enhance(contrast)
                if saturation != 1.0:
                    image = ImageEnhance.Color(image).enhance(saturation)
                if sharpness != 1.0:
                    image = ImageEnhance.Sharpness(image).enhance(sharpness)
                if rotate != 0:
                    image = image.rotate(-rotate, expand=True)
                
                output_bytes = image_to_bytes(image)
                ext = "png"
                mime_type = "image/png"
            
            elif operation == "compress":
                output_bytes = image_to_bytes(image, format=format, quality=quality)
                ext = format if format != "jpeg" else "jpg"
                mime_type = f"image/{format}"
            
            if output_bytes:
                base64_data = base64.b64encode(output_bytes).decode('utf-8')
                results.append({
                    "filename": f"{base_name}_processed.{ext}",
                    "mimeType": mime_type,
                    "data": base64_data
                })
        
        return JSONResponse(content={"files": results})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Preload AI model
    print("Initializing AI upscaler...")
    get_ai_upscaler()
    uvicorn.run(app, host="0.0.0.0", port=8000)
