import { Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import toast from 'react-hot-toast';
import { abi, NFT_CONTRACT_ADDRESS } from "../constants";

export default function Home() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [presaleStarted, setPresaleStarted] = useState(false);
  const [presaleEnded, setPresaleEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [tokenIdsMinted, setTokenIdsMinted] = useState("0");
  const web3ModalRef = useRef();


  //Mint NFT during presale
  const presaleMint = async () => {
    //Create a new instance of the Contract with a signer which allows update methods
    try {
      const signer = await getProviderOrSigner(true);

      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );

      const tx = await whitelistContract.presaleMint({
        value: utils.parseEther("0.01")
      }).catch(err=>console.log(err));

      setLoading(true);
      await tx.wait().catch(err=>console.log(err));;
      setLoading(false);
      toast.success("You have successfully minted a Crypto Dev!");
    } catch (err) {
      console.error(err);
    }
  }

  const publicMint = async () => {
    try{
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract({
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      });
      //call the mint from the contract to mint the crypto dev
      const tx = await whitelistContract.mint({
        value:utils.parseEther("0.01"),
      });
      setLoading(true);
      await tx.wait();
      setLoading(false);
      toast.success("You have successfully minted a Crypto Dev!");
    } catch(err) {
      toast.error(err);
    }
  }

  const connectWallet = async () => {
    try{
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch(err) {
      toast.error(err);
    }
  }

  const startPresale = async () => {
    try{
      console.log("Started Presale")
      const signer = await getProviderOrSigner(true);
      const whitelistContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        abi,
        signer
      )
      const tx = await whitelistContract.startPresale();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await checkIfPresaleStarted();
    } catch(err){
      toast.error(err);
    }
  }
  
  const checkIfPresaleStarted = async () => {
    try{
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS,abi,provider);
      const _presaleStarted = await nftContract.presaleStarted();
      if(!_presaleStarted){
        await getOwner();
      } 
      setPresaleStarted(_presaleStarted);
      return _presaleStarted;
    } catch (err){
      toast.error(err);
    }
  }
  const checkIfPresaleEnded = async () => {
    try {
    
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      const _presaleEnded = await nftContract.presaleEnded();
  
      const hasEnded = _presaleEnded.lt(Math.floor(Date.now() / 1000));
      if (hasEnded) {
        setPresaleEnded(true);
      } else {
        setPresaleEnded(false);
      }
      return hasEnded;
    } catch (err) {
      toast.error(err);
      return false;
    }
  };

  const getTokenIdsMinted = async () => {
    try {
      // Get the provider from web3Modal, which in our case is MetaMask
      // No need for the Signer here, as we are only reading state from the blockchain
      const provider = await getProviderOrSigner();
      // We connect to the Contract using a Provider, so we will only
      // have read-only access to the Contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS, abi, provider);
      // call the tokenIds from the contract
      const _tokenIds = await nftContract.tokenIds();
      //_tokenIds is a `Big Number`. We need to convert the Big Number to a string
      setTokenIdsMinted(_tokenIds.toString());
    } catch (err) {
      console.error(err);
    }
  };
  //get owner calls the contract to retreive the owner 
  const getOwner = async () => {
    try{
      const provider = await getProviderOrSigner();
      const nftContract = new Contract(NFT_CONTRACT_ADDRESS,abi,provider);
      const _owner = await nftContract.owner();
      const signer = getProviderOrSigner(true);
      const address = signer.getAddress();
      console.log(_owner);
      console.log(address);
      if(address.toLowerCase() === _owner.toLowerCase()){
        console.log("I am owner")
        setIsOwner(true);
      }
      
    } catch (err) {
      toast.error(err.message);
    }
  }

  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      console.error("Change the network to Rinkeby");
      toast('Change the network to Rinkeby', {
        icon: '⚠',
      });
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  useEffect(()=>{
    if(!walletConnected){
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      })
      connectWallet();
   
      const _presaleStarted = checkIfPresaleStarted();
      
      if (_presaleStarted) {
        checkIfPresaleEnded();
      }

      getTokenIdsMinted();

      // Set an interval which gets called every 5 seconds to check presale has ended
      const presaleEndedInterval = setInterval(async function () {
        const _presaleStarted = await checkIfPresaleStarted();
        if (_presaleStarted) {
          const _presaleEnded = await checkIfPresaleEnded();
          if (_presaleEnded) {
            clearInterval(presaleEndedInterval);
          }
        }
      }, 5 * 1000);

      // set an interval to get the number of token Ids minted every 5 seconds
      setInterval(async function () {
        await getTokenIdsMinted();
      }, 5 * 1000);
    }
  }, [walletConnected]);

  const renderButton = () => {
    if(!walletConnected){
      return (
        <button className="bg-stone-700 hover:bg-stone-600 active:bg-stone-800 hover:-skew-x-12 transition-all duration-500 ease-out text-white px-6 py-3" onClick={connectWallet}>
          Connect your wallet
        </button>
      )
    }

    if (loading) {
      return <button className="bg-stone-700 hover:bg-stone-600 active:bg-stone-800 hover:-skew-x-12 transition-all duration-500 ease-out text-white px-6 py-3">
        Loading...
        </button>;
    }

    // If connected user is the owner, and presale hasnt started yet, allow them to start the presale
    if (isOwner && !presaleStarted) {
      return (
        <button className="bg-stone-700 hover:bg-stone-600 active:bg-stone-800 hover:-skew-x-12 transition-all duration-500 ease-out text-white px-6 py-3"  onClick={startPresale}>
          Start Presale!
        </button>
      );
    }

    // If connected user is not the owner but presale hasn't started yet, tell them that
    if (!presaleStarted) {
      return (
        <div className="bg-stone-700 hover:bg-stone-600 active:bg-stone-800 hover:-skew-x-12 transition-all duration-500 ease-out text-white px-6 py-3">
          <div>Presale hasn't started!</div>
        </div>
      );
    }

    // If presale started, but hasn't ended yet, allow for minting during the presale period
    if (presaleStarted && !presaleEnded) {
      return (
        <div>
          <div className="mb-4 text-stone-500">
            Presale has started!!! If your address is whitelisted, Mint a
            Crypto Dev 🥳
          </div>
          <button className="bg-stone-700 hover:bg-stone-600 active:bg-stone-800 hover:-skew-x-12 transition-all duration-500 ease-out text-white px-6 py-3" onClick={()=>presaleMint()}>
            Presale Mint 🚀
          </button>
        </div>
      );
    }
    // If presale started and has ended, its time for public minting
    if (presaleStarted && presaleEnded) {
      return (
        <button className="bg-stone-700 hover:bg-stone-600 active:bg-stone-800 hover:-skew-x-12 transition-all duration-500 ease-out text-white px-6 py-3"  onClick={publicMint}>
          Public Mint 🚀
        </button>
      );
    }
  }
  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="Whitelist-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div 
      className="h-screen font-serif flex flex-col ">
      <div className="container max-w-screen-xl mx-auto justify-around gap-8 grid md:grid-cols-3 items-center p-8" >
        <div className=" gap-8 md:col-span-1 text-neutral-500">
          <h1 className="text-4xl font-extrabold  mb-4 text-neutral-800">Welcome to Crypto Devs!</h1>
          <div className="text-lg ">
            Its an NFT collection for developers in Crypto.
          </div>
          <div className="text-2xl text-neutral-600 font-semibold border-t-2 border-b-2 p-4 my-4">
            {tokenIdsMinted}/20 {' '} 
            <span className="font-normal italic text-neutral-500 text-lg">
              have been minted
            </span>
          </div>
          {renderButton()}
        </div>
        <div className="md:col-span-2 p-8">
          <img src="https://ethereum.org/static/ddb9a22d53fdaaae70c0a0d94577f2aa/52295/eth.png" />
        </div>
      </div>
      <footer className="grid place-items-center py-8">
        <div className="text-stone-600  ">
        Made by  <a className="border-b-2 font-semibold border-stone-400 text-stone-900 italic"  href='https://twitter.com/adarshzpatel'>Adarsh</a>  on <a className="border-b-2 border-stone-400 font-semibold text-stone-900 italic" href="https://learnweb3.io">learnweb3.io</a>
        </div>
      </footer>
      </div>
    </div>
  );
}