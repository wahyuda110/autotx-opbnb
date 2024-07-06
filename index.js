import { ethers } from "ethers";
import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();

// Konfigurasi jaringan
const rpcUrl = "https://opbnb-mainnet-rpc.bnbchain.org";
const chainId = 204;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

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

// Fungsi untuk mengenerate wallet baru
function generateWallet() {
    const wallet = ethers.Wallet.createRandom();
    return {
        address: wallet.address,
        privateKey: wallet.privateKey,
    };
}

// Simpan wallet ke dalam file .txt tanpa menghapus data sebelumnya
function saveWalletToFile(wallet, filePath, count) {
    const walletData = `================Akun Ke ${count}=================\nAddress: ${wallet.address}\nPrivate Key: ${wallet.privateKey}\n\n`;
    fs.appendFileSync(filePath, walletData, 'utf-8');
    console.log(`Address dan Private Key disimpan di ${filePath}`);
}

// Simpan private key ke dalam file privatekey.txt tanpa menghapus data sebelumnya
function savePrivateKeyToFile(privateKey, filePath) {
    fs.appendFileSync(filePath, `${privateKey}\n`, 'utf-8');
    console.log(`Private Key disimpan di ${filePath}`);
}

// Fungsi utama
(async () => {
    // Private key pengirim (misalnya dari dompet yang sudah ada)
    const fromPrivateKey = process.env.PRIVATE_KEY; // Ganti dengan nama variabel environment yang benar
    let count = 1;

    while (true) {
        // Generate alamat dompet baru untuk penerima
        const newWallet = generateWallet();
        const toAddress = newWallet.address;

        console.log(`Address: ${toAddress}`);
        console.log(`Private Key: ${newWallet.privateKey}`); // Simpan ini jika perlu

        // Simpan wallet baru ke dalam file .txt tanpa menghapus data sebelumnya
        saveWalletToFile(newWallet, 'result.txt', count);

        // Simpan private key ke dalam file privatekey.txt tanpa menghapus data sebelumnya
        savePrivateKeyToFile(newWallet.privateKey, 'privatekey.txt');

        // Jumlah opBNB yang ingin dikirim (dalam ether, sesuaikan jika perlu)
        const amount = 0.00000015; // ubah sesuai nominal yang diinginkan

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

        // Tunggu 30 detik sebelum membuat wallet baru
        console.log("==================== Menunggu Untuk Akun Berikut nya ====================");
        await new Promise(resolve => setTimeout(resolve, 30000));
    }
})();

// Thanks To
// Recode Form https://github.com/hajilok/autotx-evm