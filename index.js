import { ethers } from "ethers";
import fs from "fs";
import dotenv from 'dotenv';
import readline from 'readline';
dotenv.config();

// Konfigurasi jaringan
const rpcUrl = "https://opbnb-mainnet-rpc.bnbchain.org";
const chainId = 204;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

// Fungsi untuk mengenerate wallet baru
function generateRandomWallet() {
    const randomWallet = ethers.Wallet.createRandom();
    const mnemonic = randomWallet.mnemonic.phrase;
    const address = randomWallet.address;
    const privateKey = randomWallet.privateKey;

    return {
        mnemonic: mnemonic,
        address: address,
        privateKey: privateKey
    };
}

// Simpan wallet ke dalam file .txt tanpa menghapus data sebelumnya
function saveWalletToFile(wallet) {
    const walletData = `
  Mnemonic: ${wallet.mnemonic}
  Address: ${wallet.address}
  Private Key: ${wallet.privateKey}\n\n`;
    fs.appendFileSync('result.txt', walletData, (err) => {
        if (err) throw err;
    });

    const privateKeyData = `${wallet.privateKey}\n`;
    fs.appendFileSync('pk.txt', privateKeyData, (err) => {
        if (err) throw err;
    });
}

// Fungsi untuk mengirim opBNB
async function sendopBNB(fromPrivateKey, toAddress, amount, delay = 0) {
    try {
        // Buat wallet pengirim
        const senderWallet = new ethers.Wallet(fromPrivateKey, provider);

        // Periksa saldo pengirim sebelum mengirim
        const balance = await senderWallet.getBalance();
        console.log(`Sisa Saldo Pengirim: ${ethers.utils.formatEther(balance)} opBNB`);

        // Estimasikan gas price dan gas limit
        const gasPrice = await provider.getGasPrice();
        const gasLimit = ethers.utils.hexlify(21000); // Gas limit untuk transfer standar
        const txCost = gasPrice.mul(gasLimit);

        // Total biaya transaksi (amount + txCost)
        const totalAmount = ethers.utils.parseEther(amount.toString()).add(txCost);

        // Periksa jika saldo cukup
        if (balance.lt(totalAmount)) {
            throw new Error("Saldo tidak cukup untuk mengirim transaksi");
        }

        // Buat transaksi
        const tx = {
            to: toAddress,
            value: ethers.utils.parseEther(amount.toString()), // Konversi ke wei
            gasPrice: gasPrice,
            gasLimit: gasLimit,
            chainId: chainId,
        };

        // Tunggu delay (jika ada)
        if (delay > 0) {
            console.log(`Menunggu delay selama ${delay} detik...`);
            await new Promise(resolve => setTimeout(resolve, delay * 1000));
        }

        // Kirim transaksi
        const txResponse = await senderWallet.sendTransaction(tx);
        console.log(`Berhasil Mengirim opBNB ke ${txResponse.hash}`);
        return txResponse.hash;
    } catch (error) {
        console.error(`Error during transaction: ${error.message}`);
        throw error;
    }
}

// Fungsi untuk mengenerate beberapa wallet
function autoGenerateWallets(numberOfWallets) {
    for (let i = 0; i < numberOfWallets; i++) {
        const wallet = generateRandomWallet();
        console.log(`Generated Wallet:
            Mnemonic: ${wallet.mnemonic}
            Address: ${wallet.address}
            Private Key: ${wallet.privateKey}`);
        saveWalletToFile(wallet);
    }
}

// Fungsi utama
(async () => {
    // Private key pengirim (misalnya dari dompet yang sudah ada)
    const fromPrivateKey = process.env.PRIVATE_KEY; // Ganti dengan nama variabel environment yang benar
    let count = 1;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Berapa banyak wallet yang ingin di-generate? ', async (answer) => {
        const numberOfWallets = parseInt(answer, 10);
        if (isNaN(numberOfWallets) || numberOfWallets <= 0) {
            console.log('Input tidak valid. Silakan masukkan angka yang valid.');
            rl.close();
            return;
        }

        for (let i = 0; i < numberOfWallets; i++) {
            // Generate alamat dompet baru untuk penerima
            const newWallet = generateRandomWallet();
            const toAddress = newWallet.address;

            console.log(`Address: ${toAddress}`);
            console.log(`Mnemonic: ${newWallet.mnemonic}`); // Tampilkan Mnemonic

            // Simpan wallet baru ke dalam file .txt tanpa menghapus data sebelumnya
            saveWalletToFile(newWallet);

            // Jumlah opBNB yang ingin dikirim (dalam ether, sesuaikan jika perlu)
            const amount = 0.000001; // ubah sesuai nominal yang diinginkan

            let transactionSuccess = false;
            while (!transactionSuccess) {
                try {
                    await sendopBNB(fromPrivateKey, toAddress, amount);
                    transactionSuccess = true; // Berhasil mengirim transaksi, lanjut ke wallet berikutnya
                } catch (error) {
                    console.error(`Error: ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, 10000)); // Tunggu 10 detik sebelum mencoba lagi
                }
            }

            count++; // Increment the count for the next wallet
        }

        rl.close();
    });
})();
