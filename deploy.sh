echo "Compress files for deploying on remote server.."
zip -x LICENSE README.md /node_modules* /.idea* /.git* .DS_Store .gitignore -r deploy.zip .
echo "Zip file complete !"

echo "Copy Zip file to remote server.."
scp deploy.zip root@162.55.91.179:/root/app/kcc-listener
echo "File imported to server.."
echo "Process finished !"
