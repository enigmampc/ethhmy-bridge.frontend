import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
import { mulDecimals } from '../../utils';
import { getGasPrice } from './helpers';

const BN = require('bn.js');
const MAX_UINT = Web3.utils
  .toBN(2)
  .pow(Web3.utils.toBN(256))
  .sub(Web3.utils.toBN(1));

export const NFT_TOKEN_ADDRESS = '0xa47c8bf37f92aBed4A126BDA807A7b7498661acD';

interface IEthMethodsInitParams {
  web3: Web3;
  ethManagerContract: Contract;
  ethManagerAddress: string;
}

type NftDetails = {
  name: string;
  tokenURI: string;
  symbol: string;
  previewImage?: string;
};

export class EthMethodsDuplex {
  private readonly web3: Web3;
  private ethManagerContract: Contract;
  private ethManagerAddress: string;
  private erc20: any;

  constructor(params: IEthMethodsInitParams) {
    this.web3 = params.web3;
    this.ethManagerContract = params.ethManagerContract;
    this.ethManagerAddress = params.ethManagerAddress;
    this.erc20 = require('../out/NftToken.json');
  }

  sendHandler = async (method: any, args: Object, callback: Function) => {
    method
      .send(args)
      .on('transactionHash', function(hash) {
        callback({ hash });
      })
      .then(function(receipt) {
        callback({ receipt });
      })
      .catch(function(error) {
        callback({ error });
      });
  };

  isApprovedForAll = async () => {
    // @ts-ignore
    const accounts = await ethereum.enable();

    const erc721Contract = new this.web3.eth.Contract(this.erc20.abi, NFT_TOKEN_ADDRESS);

    return await erc721Contract.methods.isApprovedForAll(accounts[0], this.ethManagerAddress).call();
  };

  callApproveForAll = async (operator, callback) => {
    // @ts-ignore
    const accounts = await ethereum.enable();

    const erc721Contract = new this.web3.eth.Contract(this.erc20.abi, NFT_TOKEN_ADDRESS);

    const isApproved = await this.isApprovedForAll();

    //const gasPrices = await getGasPrice(this.web3);

    if (!isApproved) {
      this.sendHandler(
        erc721Contract.methods.setApprovalForAll(operator, true),
        {
          from: accounts[0],
          gas: process.env.ETH_GAS_LIMIT,
          // maxFeePerGas: gasPrices[0],
          // maxPriorityFeePerGas: gasPrices[1],
          gasPrice: await getGasPrice(this.web3),
          // amount: 0,
        },
        callback,
      );
    }
  };

  swapToken = async (userAddr: string, token_id: number, toScrt: number, callback) => {
    // @ts-ignore
    const accounts = await ethereum.enable();

    const secretAddrHex = this.web3.utils.fromAscii(userAddr);
    // TODO: add validation

    const estimateGas = await this.ethManagerContract.methods
      .swapToken(secretAddrHex, token_id, toScrt)
      .estimateGas({ from: accounts[0] });

    const gasLimit = Math.max(estimateGas + estimateGas * 0.3, Number(process.env.ETH_GAS_LIMIT));
    this.sendHandler(
      this.ethManagerContract.methods.swapToken(secretAddrHex, token_id, toScrt),
      {
        from: accounts[0],
        gas: new BN(gasLimit),
        gasPrice: await getGasPrice(this.web3),
      },
      callback,
    );
  };

  checkTokensInWallet = async (addr: string): Promise<number> => {
    const erc721Contract = new this.web3.eth.Contract(this.erc20.abi, NFT_TOKEN_ADDRESS);

    return await erc721Contract.methods.balanceOf(addr).call();
  };

  enumerateUserTokens = async (addr: string): Promise<Any> => {
    const erc721Contract = new this.web3.eth.Contract(this.erc20.abi, NFT_TOKEN_ADDRESS);
    const amount_owned = await this.checkTokensInWallet(addr);

    const promises = [];
    for (let i = 0; i < amount_owned; i++) {
      promises.push(this.tokenURI());
    }

    Promise.all(promises);
  };

  tokenURI = async (token_id: number): Promise<NftDetails> => {
    // if (!this.web3.utils.isAddress(erc20Address)) {
    //   throw new Error('Invalid token address');
    // }

    // const MyERC20Json = require('../out/MyERC20.json');
    // const erc721Contract = new this.web3.eth.Contract(MyERC20Json.abi, erc20Address);

    const erc721Contract = new this.web3.eth.Contract(this.erc20.abi, NFT_TOKEN_ADDRESS);

    const tokenURI = await erc721Contract.methods.tokenURI(token_id).call();
    const name = await erc721Contract.methods.name(token_id).call();
    const symbol = await erc721Contract.methods.symbol(token_id).call();

    const previewImageUrl = 


    // let name = '';
    // let symbol = '';
    // // maker has some weird encoding for these.. so whatever
    // if (erc20Address === '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2') {
    //   name = 'Maker';
    //   symbol = 'MKR';
    // } else {
    //   name = await erc721Contract.methods.name().call();
    //   symbol = await erc721Contract.methods.symbol().call();
    // }
    // // todo: check if all the erc20s we care about have the decimals method (it's not required by the standard)
    // const decimals = await erc721Contract.methods.decimals().call();
    //
    // return { name, symbol, decimals, erc20Address };
  };
}
