// API configuration for SpaceIt
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
    removeBg: `${API_URL}/remove-bg`,
    upscale: `${API_URL}/upscale`,
    edit: `${API_URL}/edit`,
    compress: `${API_URL}/compress`,
    batch: `${API_URL}/batch`,
};

export default API_URL;
