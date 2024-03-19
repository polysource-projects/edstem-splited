import { extractDisplayNameFromEPFLEmail } from './util.js';
import { Sequelize, DataTypes } from 'sequelize';

let sequelize;
let ClaimedThread;

export async function initDatabase() {
    sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    ClaimedThread = sequelize.define('ClaimedThread', {
        threadId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true
        },
        userEmail: {
            type: DataTypes.STRING,
            allowNull: false
        },
        userDisplayName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        claimedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
        }
    });
    await sequelize.sync();
}

export function createClaimedThread(threadId, userEmail, userDisplayName) {
    return ClaimedThread.create({ threadId, userEmail, userDisplayName });
}

export function deleteClaimedThread(threadId) {
    return ClaimedThread.destroy({ where: { threadId } });
}

export function getClaimedThreads() {
    // only for the past 2 days
    return ClaimedThread.findAll({
        where: {
            claimedAt: {
                [Sequelize.Op.gt]: new Date(new Date() - 1000 * 60 * 60 * 24 * 2)
            }
        }
    });
}
