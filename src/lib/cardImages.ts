import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

export async function uploadCardImage(image: Blob): Promise<string> {
  const imageRef = ref(storage, `card-images/${crypto.randomUUID()}.jpg`);
  await uploadBytes(imageRef, image, { contentType: 'image/jpeg' });
  return getDownloadURL(imageRef);
}
