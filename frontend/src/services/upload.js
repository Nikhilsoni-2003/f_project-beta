class UploadService {
  async getPresignedUrl(fileName, contentType, uploadType) {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_GATEWAY_URL}/api/media/presigned-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ fileName, contentType, uploadType })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  async uploadFile(file, presignedUrl) {
    try {
      const response = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  async uploadMedia(file, uploadType) {
    try {
      const { presignedUrl, fileUrl, key } = await this.getPresignedUrl(
        file.name, 
        file.type, 
        uploadType
      );

      await this.uploadFile(file, presignedUrl);

      return { fileUrl, key };
    } catch (error) {
      throw error;
    }
  }
}

export default new UploadService();