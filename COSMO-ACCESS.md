# COSMO Applications Access Guide

This guide explains how to access all the COSMO applications using secure complex URLs.

## Quick Access URLs

Each application requires a specific access token in the URL:

| Application | Access URL | URL-Encoded Version |
|-------------|------------|---------------------|
| Form Docentes | http://localhost/docentes/A@#$$F%65FT& | http://localhost/docentes/A@%23$$F%2565FT%26 |
| Form Acudientes | http://localhost/acudientes/@#$#%%GT% | http://localhost/acudientes/@%23$%23%25%25GT%25 |
| Form Estudiantes | http://localhost/estudiantes/%?$%#G%6$% | http://localhost/estudiantes/%25%3F$%25%23G%256$%25 |
| Stats | http://localhost/stats/$@#@$%&*?$ | http://localhost/stats/$@%23@$%25%26%2A%3F$ |

> **Note**: Some browsers or tools may require the URL-encoded version of the token when accessing the applications.

## How It Works

The proxy server provides:

1. **Enhanced Security**: Only users with the correct URL can access each application
2. **Centralized Access**: All applications are accessed through the same domain
3. **API Routing**: Backend API requests are automatically routed to the correct service

## Starting the Applications

To start all applications at once:

```bash
sudo ./start-all.sh
```

This will:
- Start all four applications
- Start the proxy server
- Set up all necessary routing
- Display the access URLs

## Stopping the Applications

To stop all running applications:

```bash
./stop-all.sh
```

## Testing the Access

To test if all application URLs are working correctly:

```bash
node test-proxy.js
```

## Troubleshooting

If you encounter any issues:

1. **Port conflicts**: Make sure no other applications are using ports 3000-3006, 4000-4001, or 80
2. **Database connection errors**: Check your database is running and accessible
3. **Access denied errors**: Verify you're using the correct URL with the exact token
4. **Special characters in URLs**: Try using the URL-encoded version of the token

## Production Deployment

For production, these URLs will be:

| Application | Production Access URL |
|-------------|------------|
| Form Docentes | https://cosmo-rlt.onrender.com/docentes/A@#$$F%65FT& |
| Form Acudientes | https://cosmo-rlt.onrender.com/acudientes/@#$#%%GT% |
| Form Estudiantes | https://cosmo-rlt.onrender.com/estudiantes/%?$%#G%6$% |
| Stats | https://cosmo-rlt.onrender.com/stats/$@#@$%&*?$ | 