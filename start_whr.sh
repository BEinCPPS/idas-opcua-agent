#!/bin/sh
node index.js -e "opc.tcp://BEINCPPS-01:26543"
#node index.js -e "opc.tcp://localhost:26543"  
# Change with your endpoint 
# -b 
# "Browse" server address

# -t <seconds> 
# seconds before shutdown Agent
# DEFAULT no timeout

# -s <port> 
# Server port
# DEFAULT 4041
# only if multiple instances are needed!

