var config = {
    logLevel: 'DEBUG',
    contextBroker: {
        host: 'localhost',
        port: 7001  
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
    //WARNING Used only with "-browse" option
    browseServerOptions: {
        mainFolderToBrowse: "ObjectsFolder",
        mainObjectStructure: {
            namePrefix: "TestStation", //devices
            variableType1: {
                nameSuffix: "Measure",
                type: "integer"
            },
            variableType2: {
                nameSuffix: "State",
                type: "string"
            },
            methodNameSuffix: "Method"
        }
    },
    //END WARNING Used only with "-browse" option
    service: 'whirlpool',
    subservice: '/cassinetta',
    providerUrl: 'http://localhost:4041', //'http://4769258e.ngrok.io'
    deviceRegistrationDuration: 'P1M',
    defaultType: 'whr-teststation',

    /* start of custom section for OPC UA mapping */
    /* WARNING Not considered with "-browse" option, built from Server Address Space*/
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
    ],
    // WARNING Used only with "-browse" option
    // Orion Subscriptions to Contexts
    // start of custom section for OPC UA mapping OCB -> Agent
    contextSubscriptions: [
        {
            id: 'FrontEndState',
            type: 'whr-mobilestation',
            mappings: [
                {
                    ocb_id: 'button',
                    opcua_id: 'ns=1;s=buttonPressed'
                }
            ]
        },
    ]
   // WARNING Used only with "-browse" option
};

module.exports = config;
