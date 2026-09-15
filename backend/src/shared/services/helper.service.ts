import { RegistrationType } from "../enums/common";

export class HelperService {

    calculateAmount(numberOfUsers: number, registrationType: RegistrationType) {
        const baseAmount: number = 5000;
        const baseUsers: number = 200
        const perUserPrice: number = 100;

        switch (registrationType) {
            case RegistrationType.HOTEL:
                if (numberOfUsers <= baseUsers) {
                    return baseAmount;
                } else {
                    const extraUsers = numberOfUsers - baseUsers;
                    return baseAmount + (extraUsers * perUserPrice);
                }
            case RegistrationType.USER:
                return perUserPrice;
            default:
                break;
        }
    }

    generateRandomPassword(length: number = 8) {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
        const digits = "0123456789";
        const symbols = "!@#$%^&*()_+[]{}|;:,.<>?";

        const allChars = letters + digits + symbols;

        let password = [
            letters[Math.floor(Math.random() * letters.length)],
            digits[Math.floor(Math.random() * digits.length)],
            symbols[Math.floor(Math.random() * symbols.length)]
        ];

        for (let i = password.length; i < length; i++) {
            password.push(allChars[Math.floor(Math.random() * allChars.length)]);
        }

        password = password.sort(() => Math.random() - 0.5);

        return password.join('');
    }

}