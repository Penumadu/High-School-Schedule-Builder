'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import styles from './Signup.module.css';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolId: '',
    principalEmail: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'schoolId') {
      // Sanitize school ID: lowercase, underscores, numbers only
      const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      setFormData(prev => ({ ...prev, [name]: sanitized }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/signup', {
        school_name: formData.schoolName,
        school_id: formData.schoolId,
        principal_email: formData.principalEmail,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
      });

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.signupContainer}>
      <div className={styles.signupCard}>
        <h1 className={styles.title}>Create Your School</h1>
        <p className={styles.subtitle}>Register your institution to start building schedules</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '24px', fontSize: '13px' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div className={styles.successMessage}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">School Name</label>
              <input
                type="text"
                name="schoolName"
                className="form-input"
                value={formData.schoolName}
                onChange={handleChange}
                required
                placeholder="e.g. Springfield High"
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">School ID (for URL)</label>
              <input
                type="text"
                name="schoolId"
                className="form-input"
                value={formData.schoolId}
                onChange={handleChange}
                required
                placeholder="e.g. springfield_high"
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Lowercase, numbers, and underscores only.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Principal First Name</label>
              <input
                type="text"
                name="firstName"
                className="form-input"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="John"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Principal Last Name</label>
              <input
                type="text"
                name="lastName"
                className="form-input"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Doe"
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="principalEmail"
                className="form-input"
                value={formData.principalEmail}
                onChange={handleChange}
                required
                placeholder="principal@school.edu"
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                minLength={8}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '16px', height: '48px' }}
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Register School'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)', marginTop: '24px' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
