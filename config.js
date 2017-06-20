var config = {
  logLevel: process.env.LEVEL_LOG || 'info', // options debug, info, error
  contextBroker: {
    host: process.env.ORION_HOST || 'localhost',
    port: process.env.ORION_PORT || 1026
  },
  server: {
    port: process.env.LOCAL_PORT || 4041
  },
  deviceRegistry: {
    type: 'memory'
  },
  discardEqualValues: process.env.DISCARD_EQUAL_VALUES || true, // **IMPORTANT** This flag sends to ORION only diff values arrived from OPCUA
  samplingInterval: process.env.SAMPLING_INTERVAL || 2000,
  types: {
    'teststation': {
      service: process.env.ORION_FIWARE_SERVICE || 'whirlpool',
      subservice: process.env.ORION_FIWARE_SUBSERVICE || '/cassinetta',
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
    // END WARNING Used only with "--browse" option
  service: process.env.ORION_FIWARE_SERVICE || 'whirlpool',
  subservice: process.env.ORION_FIWARE_SUBSERVICE || '/cassinetta',
  providerUrl: 'http://' + process.env.CYGNUS_NGSI_HOST + ':' + process.env.CYGNUS_NGSI_PORT || 'http://172.20.0.3:5050',
  deviceRegistrationDuration: 'P1M', // one month
  defaultType: 'teststation',

  contexts: require('./config-idas.json') || [{
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
  }],
  contextSubscriptions: [{
    id: 'FrontEndState',
    type: 'mobilestation',
    mappings: [{
      ocb_id: 'button',
      opcua_id: 'ns=1;s=buttonPressed'
    }]
  }],
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
      host: process.env.DATABASE_BEINCPPS_HOST || '127.0.0.1',
      database: process.env.DATABASE_BEINCPPS_NAME || 'BeInCPPS',
      user: process.env.DATABASE_BEINCPPS_USER || 'sa',
      password: process.env.DATABASE_BEINCPPS_PASSWORD || 'Fiware2017!',
      pool: { // OPTIONAL NOT USED YET!!!
        max: 10,
        min: 4,
        idleTimeoutMillis: 30000
      },
      languageDb: process.env.DB_LANGUAGE || 0 // English use 0 possible options 1 or 2
    }
  }
   // WARNING Used only with "--browse" option
}
module.exports = config
