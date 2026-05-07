/**
 * Admin Settings Script
 */
import { initTheme, toast } from '../../scripts/modules/ui.js';
import { renderAdminSidebar } from '../components/AdminSidebar.js';
import { renderAdminHeader } from '../components/AdminHeader.js';
import { requireAdmin, getCurrentUser } from '../../scripts/modules/auth.js';
import { api } from '../../scripts/modules/api.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  initTheme();
  renderAdminSidebar('settings');
  renderAdminHeader();

  const user = getCurrentUser();

  const nameInput = document.querySelector('input[value="Administrator"]');
  const emailInput = document.querySelector('input[type="email"]');
  const saveBtn = document.getElementById('saveSettingsBtn');
  const passwordInput = document.querySelectorAll('input[type="password"]')[1]; // New password
  const confirmInput = document.querySelectorAll('input[type="password"]')[2]; // Confirm password

  // Fill current data
  if (user) {
    if (nameInput) nameInput.value = user.fullName || '';
    if (emailInput) {
      emailInput.value = user.email || '';
      emailInput.disabled = false; // Now editable
    }
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // Get form values
      const newFullName = nameInput?.value?.trim();
      const newEmail = emailInput?.value?.trim();
      const currentPassword = document.getElementById('currentPassword')?.value?.trim();
      const newPassword = passwordInput?.value?.trim();
      const confirmPassword = confirmInput?.value?.trim();
      
      // Validate
      if (!newFullName || !newEmail) {
        toast.error('Iltimos, barcha maydonlarni to\'ldiring');
        return;
      }
      
      if (newPassword && newPassword !== confirmPassword) {
        toast.error('Yangi parol va tasdiqlash mos kelmadi');
        return;
      }
      
      if (newPassword && !currentPassword) {
        toast.error('Parolni o\'zgartirish uchun joriy parolni kiriting');
        return;
      }
      
      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saqlanmoqda...';
        
        // Prepare update data
        const updateData = { fullName: newFullName };
        
        // Only update email if it changed
        if (newEmail !== user.email) {
          updateData.email = newEmail;
        }
        
        // Only update password if provided
        if (newPassword) {
          updateData.currentPassword = currentPassword;
          updateData.newPassword = newPassword;
        }
        
        // Call API to update profile
        const response = await api.auth.updateProfile(updateData);
        
        if (response.success) {
          // Update current user in storage
          if (response.data.user) {
            localStorage.setItem('olimpx_current_user', JSON.stringify(response.data.user));
          }
          
          toast.success('Profil muvaffaqiyatli yangilandi!', 'Sozlamalar');
          
          // Reload page to show updated data
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast.error(response.error || 'Yangilashda xatolik yuz berdi');
        }
      } catch (error) {
        console.error('Settings update error:', error);
        toast.error('Yangilashda xatolik yuz berdi');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'O\'zgarishlarni saqlash';
      }
    });
  }

  // --- Password Visibility Toggle Logic ---
  const passwordToggles = document.querySelectorAll('.password-toggle');
  
  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = toggle.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const eyeOn = toggle.querySelector('.eye-on');
      const eyeOff = toggle.querySelector('.eye-off');

      if (input.type === 'password') {
        input.type = 'text';
        if (eyeOn) eyeOn.style.display = 'block';
        if (eyeOff) eyeOff.style.display = 'none';
      } else {
        input.type = 'password';
        if (eyeOn) eyeOn.style.display = 'none';
        if (eyeOff) eyeOff.style.display = 'block';
      }
    });
  });
});



