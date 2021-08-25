import { EthMethods } from './EthMethods';
import { EthMethodsERC20 } from './EthMethodsERC20';
import { TOKEN } from '../../stores/interfaces';
import { EthMethodsSefi } from './EthMethodsSefi';
import { NETWORKS } from './networks';
import { EthMethodsDuplex } from './EthMethodsDuplex';

const Web3 = require('web3');

const web3URL = window.web3 ? window.web3.currentProvider : process.env.ETH_NODE_URL;

export const web3 = new Web3(web3URL);

const ethManagerDuplexJson = require('../out/DuplexBridge.json');
const ethManagerJson = require('../out/MultiSigSwapWallet.json');

const ethManagerContract = new web3.eth.Contract(ethManagerJson.abi, process.env.ETH_MANAGER_CONTRACT);
const bscManagerContract = new web3.eth.Contract(ethManagerJson.abi, process.env.BSC_MANAGER_CONTRACT);
const duplexEthManagerContract = new web3.eth.Contract(
  ethManagerDuplexJson.abi,
  process.env.DUPLEX_ETH_MANAGER_CONTRACT,
);

const plmManagerContract = new web3.eth.Contract(ethManagerJson.abi, process.env.PLSM_MANAGER_CONTRACT);

export const fromScrtMethods: Record<NETWORKS, Record<TOKEN, any>> = {
  [NETWORKS.PLSM]: {
    [TOKEN.NATIVE]: new EthMethods({
      web3: web3,
      ethManagerContract: plmManagerContract,
    }),
    [TOKEN.ERC20]: new EthMethodsERC20({
      web3: web3,
      ethManagerContract: plmManagerContract,
      ethManagerAddress: process.env.PLSM_MANAGER_CONTRACT,
    }),
    [TOKEN.DUPLEX]: null,
    [TOKEN.S20]: null,
  },
  [NETWORKS.ETH]: {
    [TOKEN.NATIVE]: new EthMethods({
      web3: web3,
      ethManagerContract: ethManagerContract,
    }),
    [TOKEN.DUPLEX]: new EthMethodsDuplex({
      web3: web3,
      ethManagerContract: duplexEthManagerContract,
      ethManagerAddress: process.env.DUPLEX_ETH_MANAGER_CONTRACT,
    }),
    [TOKEN.ERC20]: new EthMethodsERC20({
      web3: web3,
      ethManagerContract: ethManagerContract,
      ethManagerAddress: process.env.ETH_MANAGER_CONTRACT,
    }),
    [TOKEN.S20]: null,
  },
  [NETWORKS.BSC]: {
    [TOKEN.NATIVE]: new EthMethods({
      web3: web3,
      ethManagerContract: bscManagerContract,
    }),

    [TOKEN.ERC20]: new EthMethodsERC20({
      web3: web3,
      ethManagerContract: bscManagerContract,
      ethManagerAddress: process.env.BSC_MANAGER_CONTRACT,
    }),
    [TOKEN.S20]: null,
    [TOKEN.DUPLEX]: null,
  },
  [NETWORKS.XMR]: null,
};

const sefiTokenCompiledContract = require('../out/MyERC20.json');
const sefiTokenContract = new web3.eth.Contract(sefiTokenCompiledContract.abi, process.env.ETH_GOV_TOKEN_ADDRESS);

const sefiDistCompiledContract = require('../out/MerkleDistributor.json');
const sefiDistContract = new web3.eth.Contract(sefiDistCompiledContract.abi, process.env.ETH_DIST_TOKEN_ADDRESS);

export const ethMethodsSefi = new EthMethodsSefi({
  web3: web3,
  govTokenContract: sefiTokenContract,
  distributionContract: sefiDistContract,
});
