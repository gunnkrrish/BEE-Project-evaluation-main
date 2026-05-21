import axiosInstance from './axiosInstance';

const uploadImage = async (imageFile) => {
    console.log("Starting image upload...");
    console.log("File details:", {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
      isFile: imageFile instanceof File
    });

    const formData = new FormData();
    formData.append('image', imageFile);
    
    try {
      // Log FormData contents
      for (let [key, value] of formData.entries()) {
        console.log(`FormData - ${key}:`, value);
      }

      // Don't set Content-Type header - axios will handle it correctly with boundary
      const response = await axiosInstance.post('/image-upload', formData);
      
      console.log('Image upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      throw error;
    }
};

export default uploadImage;