import { ethers } from "ethers";

export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export const CONTRACT_ABI = [
    {
        name: "safeMint",
        type: "function",
        stateMutability: "nonpayable",
        inputs: [
            { name: "to", type: "address" },
            { name: "uri", type: "string" },
            { name: "questionHash", type: "string" },
        ],
        outputs: [],
    },
];

export function getBadgeContract(signerOrProvider: ethers.Signer | ethers.Provider) {
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
}
