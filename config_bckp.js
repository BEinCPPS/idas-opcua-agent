var config = {
    logLevel: 'DEBUG',
    contextBroker: {
        host: '161.27.159.64',  //http://ns3692465.ip-149-202-205.eu
        port: 8080  //7001
    },
    server: {
        port: 4041
    },
    deviceRegistry: {
        type: 'memory'
    },
    types: {
        'whr-teststation': {
            service: 'whirlpool',
            subservice: '/cassinetta',
            active: [
                {
                    name: 'attrib1',
                    type: 'float'
                },
                {
                    name: 'attrib2',
                    type: 'float'
                },
                {
                    name: 'attrib3',
                    type: 'string'
                }
            ],
            lazy: [],
            commands: []
        } 
    }, 
    service: 'whirlpool',
    subservice: '/cassinetta',
    providerUrl: 'http://c880b292.ngrok.io',
    deviceRegistrationDuration: 'P1M',
    defaultType: 'whr-teststation',
    
/* start of custom section for OPC UA mapping */
    contexts: [
        {
           id: 'MyDevice1',
            type: 'whr-teststation',
            mappings: [
                {
                    ocb_id: 'attrib1',
                    opcua_id: 'ns=1;s=PumpSpeed'
                },
                {
                    ocb_id: 'attrib2',
                    opcua_id: 'ns=1;s=Temperature'
                }
            ]
        },
        {
            id: 'MyDevice2',
            type: 'whr-teststation',
            mappings: [
                {
                    ocb_id: 'attrib1',
                    opcua_id: 'ns=1;s=PumpSpeed2'
                },
                {
                    ocb_id: 'attrib2',
                    opcua_id: 'ns=1;s=Temperature2'
                }
            ]
        }
    ]
};

module.exports = config;
