# collections
Webapp for managing collections of items, written for learning purposes (Node.js, HTML, Javascript, JSON, Docker, Kubernetes, public cloud, OWASP best practices, identity management, ...), and as a sort of backend for my personal website.

The "database" for storing information is a JSON file.

Not ready for prod yet: security improvement in progress.

## Localhost install

Install Node.js

`git clone https://github.com/giuliano-ippoliti/collections.git`

`npm install`

Set variables in .env file (PORT, SECRET) 

`npm start`

Go to http://localhost:8080/ (8080 is the default port)

You can now start creating collections

## Deploy to Azure

Deploying to Azure is really easy from Visual Studio Code :

- Install Azure extensions into Visual Studio Code (https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-node-azure-pack)
- Do not modify the listen port (8080)
- Click the upload button for uploading to Azure (cf https://docs.microsoft.com/fr-fr/azure/app-service/app-service-web-get-started-nodejs)
- The application will be accessible at <appname>.azurewebsites.net