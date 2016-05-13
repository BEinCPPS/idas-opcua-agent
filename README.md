##IDAS OPC-UA Agent
###HOW TO RUN THE IDAS OPC-UE AGENT AGAINST A LOCAL SIMULATED OPC-UE SERVER
###Pre-requisites
A. Your project structure is as follows: <br/>
```
<your_project_dir>
   |__ node-opcua (the original NodeOPCUA SDK distribution)
   |__ idas-opcua-agent (your IDAS OPC-UA Agent)
```
B. You have an _unsecured_ Orion Context Broker (OCB) instance running on some host that you can reach on the network<br/>
C. Configure the IDAS OPC-UA Agent (Agent) so that it can talk to the OCB instance:
<br/>
<br/>

1. Open a terminal session
2. ```cd to <your_project_dir>/node-opcua```
3. Launch the simulated Server: ```node bin/simple_server.js```
4. Look at the on-screen log for any problems 
5. Once the server has initialized itself, take note of the endpoint: look at "endpointUrl" log line on the screen (something like "**opc.tcp://<machine_name>:<port>**")
6. Leave the terminal session running: you can shut down the Server anytime by pressing CTRL+C
7. Open a new and separate terminal session
8. ```cd to <your_project_dir>/opcua-agent```
9. Launch the Agent: node index.js -e "<endpointUrl>" (e.g., ```node index.js -e "opc.tcp://UbuntuDesk:26543"```
10. Look at the on-screen log for any problems, and enjoy yourself ;-)
11. The agent will terminate itself when done

