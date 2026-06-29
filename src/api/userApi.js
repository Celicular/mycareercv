import axiosClient from './axiosClient';

/**
 * Update current user's profile settings.
 * @param {object} data { name, email, password }
 */
export async function updateProfile(data) {
  const res = await axiosClient.put('/auth/me', data);
  return res.data;
}

export async function deleteAccount() {
  const res = await axiosClient.delete('/auth/me');
  return res.data;
}
