#! /bin/bash

##Variables
user="genesys"
pass="LXS6wx#k7YR8_d4v"

##Add user with password
cat /etc/passwd | grep  >/dev/null 2>&1
if
        [ 0 -eq 0 ] ; then
        echo "User Exists"
else
        useradd -p  
        echo "user "" is created"
fi

##Gve sudo access to users
touch /etc/sudoers.d/
echo """  ALL=(ALL)  NOPASSWD:ALL" >> /etc/sudoers.d/
echo "granted user with sudo access."

## Enable Password Authentication
if
        grep -Fxq "#PasswordAuthentication no" /etc/ssh/sshd_config;
        then
        echo "Changed from #PasswordAuthentication no to PasswordAuthentication yes"
        sed -i 's/#PasswordAuthentication no/PasswordAuthentication yes/g' /etc/ssh/sshd_config
        service sshd restart
elif
        grep -Fxq "#PasswordAuthentication yes" /etc/ssh/sshd_config;
        then
        echo "Changed from #PasswordAuthentication yes to PasswordAuthentication yes"
        sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/g' /etc/ssh/sshd_config
        service sshd restart
elif
        grep -Fxq "PasswordAuthentication no" /etc/ssh/sshd_config;
        then
        echo "Changed from PasswordAuthentication no to PasswordAuthentication yes"
        sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/g' /etc/ssh/sshd_config
        service sshd restart
elif
        grep -Fxq "PasswordAuthentication yes" /etc/ssh/sshd_config;
        then
        echo "PasswordAuthentication already set as yes"
fi
