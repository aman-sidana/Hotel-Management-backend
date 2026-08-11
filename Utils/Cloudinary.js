const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name:'dqfhn7rw3',
    api_key:'382695276612379',
    api_secret:'3XWIpGNiRSe2K2Cs2t9-fUtPPY0'
})


exports.uploadImage = async (files) => {
    console.log(`>>>>>>files`,files);
   
  const fileArray = Object.values(files); 
  const results = []; 

  for (const file of fileArray) {
    try {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          (error, result) => {
            console.log(`>>>>>>>>>>>error, result`,error, result);
           
            if (error) {
              reject(error); 
            } else {
              resolve(result);            }
          }
        ).end(file.data); 
      });

      results.push(result);
    } catch (error) {
      console.error('Error uploading file:', error); 
    }
  }

  return results;
};