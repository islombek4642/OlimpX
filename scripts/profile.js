/**
 * ============================================
 * OlimpX - Profile Page Script
 * Now fetching data from the Backend API
 * ============================================
 */

import { requireAuth, getCurrentUser, syncProfile } from './modules/auth.js';
import { initTheme, toast, setButtonLoading } from './modules/ui.js';
import { renderNavbar } from '../components/Navbar.js';
import { initPageTransitions } from '../components/PageTransition.js';
import { api } from './modules/api.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (!requireAuth()) return;

    initTheme();
    initPageTransitions();
    renderNavbar('profile');

    // Sync latest data from server
    await syncProfile();
    
    const user = getCurrentUser();
    const form = document.getElementById('profileForm');
    
    if (!user) return;

    // Populate form
    document.getElementById('fullName').value = user.fullName || '';
    document.getElementById('email').value = user.email || '';

    // Handle form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      setButtonLoading(submitBtn, true, 'Saqlanmoqda...');

      const fullName = document.getElementById('fullName').value.trim();

      try {
        const result = await api.users.updateProfile({ fullName });

        if (result.success) {
          // Sync local storage with new data
          await syncProfile();
          toast.success('Profil muvaffaqiyatli yangilandi!');
        } else {
          toast.error(result.error || 'Xatolik yuz berdi');
        }
      } catch (error) {
        toast.error(error.message);
      } finally {
        setButtonLoading(submitBtn, false);
      }
    });

    // Handle password change
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
          return toast.error('Parollar mos kelmadi');
        }

        if (newPassword.length < 6) {
          return toast.error('Parol kamida 6 ta belgidan iborat bo\'lishi kerak');
        }

        const submitBtn = passwordForm.querySelector('button[type="submit"]');
        setButtonLoading(submitBtn, true, 'Yangilanmoqda...');

        try {
          // Assuming the API has an updatePassword method or updateProfile handles it
          const result = await api.users.updateProfile({ password: newPassword });
          
          if (result.success) {
            toast.success('Parol muvaffaqiyatli yangilandi!');
            passwordForm.reset();
          } else {
            toast.error(result.error || 'Xatolik yuz berdi');
          }
        } catch (error) {
          toast.error(error.message);
        } finally {
          setButtonLoading(submitBtn, false);
        }
      });
    }

  } catch (error) {
    console.error('Profile Initialization Error:', error);
  }
});
