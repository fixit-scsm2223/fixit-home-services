# Deployment Guide

This document explains how the FixIt project will be deployed.

## Parts to Deploy

The project has three main parts:

1. Vue frontend
2. PHP Slim backend API
3. MySQL database

## Frontend Deployment

The Vue frontend will be deployed to a public hosting platform.

Possible platforms:

- Vercel
- Netlify
- GitHub Pages

## Backend Deployment

The PHP Slim 4 backend API will be deployed to a hosting platform that supports PHP.

Possible platforms:

- Render
- Railway
- InfinityFree
- 000webhost
- University server, if provided

## Database Deployment

The MySQL database will be deployed using a free or cloud database service.

Possible platforms:

- Railway MySQL
- PlanetScale
- Aiven
- Hosting provider MySQL database

## Mobile Build

The customer-side web app will be wrapped using Capacitor for Android.

## Environment Variables

The project will use environment variables for:

- Database host
- Database name
- Database username
- Database password
- JWT secret key

## Final Demo Requirements

The final demo should show:

- Public frontend URL
- Working backend API
- MySQL database connection
- JWT login
- Role-based access
- Android build running on emulator or device
