import { TOKEN } from '../../stores/interfaces';
import { NETWORKS } from './networks';
import { EthMethodsERC721 } from './EthMethodsNftToken';

const Web3 = require('web3');

const web3URL = window.web3 ? window.web3.currentProvider : process.env.ETH_NODE_URL;

export const web3 = new Web3(web3URL);

const ethManagerJson = require('../out/NftBridge.json');

const ethManagerContract = new web3.eth.Contract(ethManagerJson.abi, process.env.ETH_MANAGER_CONTRACT);

export const evmMethods: Record<NETWORKS, Record<TOKEN, any>> = {
  [NETWORKS.PLSM]: {
    [TOKEN.ERC721]: null,
    [TOKEN.S20]: null,
  },
  [NETWORKS.ETH]: {
    [TOKEN.ERC721]: new EthMethodsERC721({
      web3: web3,
      ethManagerContract: ethManagerContract,
      ethManagerAddress: process.env.ETH_MANAGER_CONTRACT,
    }),
    [TOKEN.S20]: null,
  },
  [NETWORKS.BSC]: {
    [TOKEN.ERC721]: null,
    [TOKEN.S20]: null,
  },
  [NETWORKS.XMR]: null,
};

