var config = {
  // logLevel: 'DEBUG',
  contextBroker: {
    host: 'localhost',
    port: 1026
  },
  server: {
    port: 4041
  },
  deviceRegistry: {
    type: 'memory'
  },
  discardEqualValues: true, // **IMPORTANT** This flag sends to ORION only diff values arrived from OPCUA
  types: {
    'teststation': {
      service: 'whirlpool',
      subservice: '/napoli',
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
    // WARNING Used only with "--browse" option
  browseServerOptions: {
    mainFolderToBrowse: 'TestStationFolder',
    eventNotifier: 'TestStationEventNotifier',
    mainObjectStructure: {
      namePrefix: 'TestStation', // devices
      variableType1: {
        name: 'variableType1',
        namePrefix: 'measure',
        type: 'integer',
        properties: []
      },
      variableType2: {
        name: 'variableType2',
        namePrefix: 'state',
        type: 'string',
        properties: [{
          name: 'statePayload',
          type: 'string'
        }]
      },
      variableType3: {
        name: 'variableType3',
        namePrefix: 'acknowledge',
        type: 'string',
        properties: []
      },
      variableType4: {
        name: 'variableType4',
        namePrefix: 'stationInfo',
        type: 'string',
        properties: [{
          name: 'ipAddress',
          type: 'string'
        }]
      },
      method: {
        namePrefix: 'Method',
        type: 'method'
      }
    },
    databaseConnection: {
      host: '127.0.0.1',
      database: 'BeInCPPS',
      user: 'sa',
      password: 'Fiware2017!',
      pool: { // OPTIONAL NOT USED YET!!!
        max: 10,
        min: 4,
        idleTimeoutMillis: 30000
      },
      languageDb: 0 // English use 0 possible options 1 or 2
    }
  },
    // END WARNING Used only with "--browse" option
  service: 'whirlpool',
  subservice: '/napoli',
  providerUrl: 'http://172.20.0.3:5050',
  deviceRegistrationDuration: 'P1M', // one month
  defaultType: 'teststation',

    /* start of custom section for OPC UA mapping */
    /* WARNING Not considered with "--browse" option, built from Server Address Space */
  contexts: [{
    id: 'MyDevice1',
    type: 'teststation',
    mappings: [{
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
    type: 'teststation',
    mappings: [{
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
  contextSubscriptions: [{
    id: 'FrontEndState',
    type: 'mobilestation',
    mappings: [{
      ocb_id: 'button',
      opcua_id: 'ns=1;s=buttonPressed'
    }]
  } ]
}
module.exports = config
