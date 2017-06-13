FROM node:boron
MAINTAINER Antonio Scatoloni (antonio.scatoloni@eng.it)
# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
ADD . /usr/src/app/
#RUN npm install

# VOLUME /usr/src/app

# Execute app
CMD [ "npm", "start" ]
