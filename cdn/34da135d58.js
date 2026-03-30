const { MessagesUpsert } = require('./source/message.js');
const fs = require('fs');
const chalk = require('chalk');
const { proto, areJidsSameUser, downloadContentFromMessage, generateWAMessageFromContent, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const moment = require('moment-timezone');
const { createCanvas, loadImage } = require('canvas');

async function initializerHandler(alip, store) {
    
    const sendGroupNotif = async (jid, teks, mentions = []) => {
        const qkontak = {
            key: {
                participant: `13135550002@s.whatsapp.net`,
                remoteJid: `status@broadcast`
            },
            message: {
                'contactMessage': {
                    'displayName': `${global.botname || 'WhatsApp Bot'}`,
                    'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:XL;ttname,;;;\nFN:ttname\nitem1.TEL;waid=13135550002:+1 (313) 555-0002\nitem1.X-ABLabel:Ponsel\nEND:VCARD`,
                    sendEphemeral: true
                }
            }
        };

        return alip.sendMessage(jid, {
            text: teks,
            contextInfo: {
                mentionedJid: mentions,
                isForwarded: true,
                forwardingScore: 9999,
                businessMessageForwardInfo: { 
                    businessOwnerJid: global.owner + "@s.whatsapp.net" 
                },
                externalAdReply: {
                    title: `𐔈⃘ ֹֹ ${global.botname} v${global.versi || '1.0'}`,
                    body: `ׅ𔖰᷼𔖮 © ${global.namaOwner}`,
                    thumbnailUrl: global.image?.reply || null,
                    sourceUrl: global.linkMenu || null,
                    mediaType: 1
                }
            }
        }, { quoted: qkontak });
    };

    async function getProfilePicture(jid) {
        try {
            const url = await alip.profilePictureUrl(jid, 'image');
            if (url && !url.includes('undefined') && !url.includes('null')) {
                return url;
            }
        } catch {}
        return 'https://telegra.ph/file/a059a6a734ed202c879d3.jpg';
    }

    function getFinalJid(jid, metadata) {
        if (!jid) return jid;
        if (jid.endsWith('@lid')) {
            const participant = metadata?.participants?.find(p => p.lid === jid || p.id === jid);
            return participant && participant.jid ? participant.jid : jid;
        }
        return jid;
    }

    async function createWelcomeCanvas(profileUrl, name, groupName, memberCount) {
        try {
            const width = 1280;
            const height = 720;
            
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            
            let background;
            try {
                if (global.image?.welcome && global.image.welcome.startsWith('http')) {
                    background = await loadImage(global.image.welcome);
                } else {
                    background = await loadImage('https://telegra.ph/file/a059a6a734ed202c879d3.jpg');
                }
            } catch {
                background = await loadImage('https://telegra.ph/file/a059a6a734ed202c879d3.jpg');
            }
            
            ctx.drawImage(background, 0, 0, width, height);
            
            const overlayGradient = ctx.createLinearGradient(0, 0, width, height);
            overlayGradient.addColorStop(0, 'rgba(0, 20, 40, 0.75)');
            overlayGradient.addColorStop(0.5, 'rgba(0, 30, 60, 0.85)');
            overlayGradient.addColorStop(1, 'rgba(0, 10, 30, 0.95)');
            ctx.fillStyle = overlayGradient;
            ctx.fillRect(0, 0, width, height);
            
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            for (let i = 0; i < width; i += 60) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, height);
                ctx.stroke();
            }
            for (let i = 0; i < height; i += 60) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(width, i);
                ctx.stroke();
            }
            ctx.restore();
            
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(50, 50);
            ctx.lineTo(150, 50);
            ctx.lineTo(150, 150);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(width - 50, 50);
            ctx.lineTo(width - 150, 50);
            ctx.lineTo(width - 150, 150);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(50, height - 50);
            ctx.lineTo(150, height - 50);
            ctx.lineTo(150, height - 150);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(width - 50, height - 50);
            ctx.lineTo(width - 150, height - 50);
            ctx.lineTo(width - 150, height - 150);
            ctx.stroke();
            ctx.restore();
            
            const avatarSize = 200;
            const avatarX = (width - avatarSize) / 2;
            const avatarY = 120;
            
            ctx.save();
            ctx.shadowColor = 'rgba(0, 255, 255, 0.6)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            ctx.clip();
            
            let avatar;
            try {
                if (profileUrl && !profileUrl.includes('undefined')) {
                    avatar = await loadImage(profileUrl);
                } else {
                    avatar = await loadImage('https://telegra.ph/file/a059a6a734ed202c879d3.jpg');
                }
            } catch {
                avatar = await loadImage('https://telegra.ph/file/a059a6a734ed202c879d3.jpg');
            }
            
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
            
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 25;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;
            ctx.font = 'bold 52px "Arial", "Helvetica", sans-serif';
            ctx.fillStyle = '#00ffff';
            ctx.textAlign = 'center';
            ctx.fillText('SELAMAT DATANG', width/2, 380);
            
            const lineGradient = ctx.createLinearGradient(width/2 - 200, 0, width/2 + 200, 0);
            lineGradient.addColorStop(0, 'transparent');
            lineGradient.addColorStop(0.3, '#00ffff');
            lineGradient.addColorStop(0.7, '#00ffff');
            lineGradient.addColorStop(1, 'transparent');
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(width/2 - 200, 400);
            ctx.lineTo(width/2 + 200, 400);
            ctx.stroke();
            ctx.restore();
            
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 3;
            ctx.font = 'bold 32px "Arial", "Helvetica", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('Semoga Betah', width/2, 440);
            ctx.restore();
            
            ctx.save();
            ctx.font = '26px "Arial", "Helvetica", sans-serif';
            ctx.fillStyle = '#a0a0a0';
            ctx.textAlign = 'center';
            ctx.fillText(groupName.substring(0, 45), width/2, 485);
            ctx.restore();
            
            ctx.save();
            ctx.fillStyle = 'rgba(0, 255, 255, 0.12)';
            ctx.beginPath();
            ctx.roundRect(width/2 - 110, 510, 220, 42, 21);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(width/2 - 110, 510, 220, 42, 21);
            ctx.stroke();
            
            ctx.font = 'bold 22px "Arial", "Helvetica", sans-serif';
            ctx.fillStyle = '#00ffff';
            ctx.textAlign = 'center';
            ctx.fillText(`Member #${memberCount}`, width/2, 538);
            ctx.restore();
            
            return canvas.toBuffer('image/png');
            
        } catch (error) {
            console.error('Error creating welcome canvas:', error);
            return null;
        }
    }

    async function createLeftCanvas(profileUrl, name, groupName, memberCount) {
        try {
            const width = 1280;
            const height = 720;
            
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            
            let background;
            try {
                if (global.image?.left && global.image.left.startsWith('http')) {
                    background = await loadImage(global.image.left);
                } else {
                    background = await loadImage('https://telegra.ph/file/a059a6a734ed202c879d3.jpg');
                }
            } catch {
                background = await loadImage('https://telegra.ph/file/a059a6a734ed202c879d3.jpg');
            }
            
            ctx.drawImage(background, 0, 0, width, height);
            
            const overlayGradient = ctx.createLinearGradient(0, 0, width, height);
            overlayGradient.addColorStop(0, 'rgba(40, 0, 0, 0.75)');
            overlayGradient.addColorStop(0.5, 'rgba(60, 0, 0, 0.85)');
            overlayGradient.addColorStop(1, 'rgba(30, 0, 0, 0.95)');
            ctx.fillStyle = overlayGradient;
            ctx.fillRect(0, 0, width, height);
            
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.08)';
            ctx.lineWidth = 1;
            for (let i = 0; i < width; i += 60) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i, height);
                ctx.stroke();
            }
            for (let i = 0; i < height; i += 60) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(width, i);
                ctx.stroke();
            }
            ctx.restore();
            
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.15)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(50, 50);
            ctx.lineTo(150, 50);
            ctx.lineTo(150, 150);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(width - 50, 50);
            ctx.lineTo(width - 150, 50);
            ctx.lineTo(width - 150, 150);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(50, height - 50);
            ctx.lineTo(150, height - 50);
            ctx.lineTo(150, height - 150);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(width - 50, height - 50);
            ctx.lineTo(width - 150, height - 50);
            ctx.lineTo(width - 150, height - 150);
            ctx.stroke();
            ctx.restore();
            
            const avatarSize = 200;
            const avatarX = (width - avatarSize) / 2;
            const avatarY = 120;
            
            ctx.save();
            ctx.shadowColor = 'rgba(255, 80, 80, 0.6)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2 + 5, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.9)';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
            
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize/2, avatarY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            ctx.clip();
            
            let avatar;
            try {
                if (profileUrl && !profileUrl.includes('undefined')) {
                    avatar = await loadImage(profileUrl);
                } else {
                    avatar = await loadImage('https://telegra.ph/file/a059a6a734ed202c879d3.jpg');
                }
            } catch {
                avatar = await loadImage('https://telegra.ph/file/a059a6a734ed202c879d3.jpg');
            }
            
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
            
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 25;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 5;
            ctx.font = 'bold 52px "Arial", "Helvetica", sans-serif';
            ctx.fillStyle = '#ff6b6b';
            ctx.textAlign = 'center';
            ctx.fillText('SELAMAT JALAN', width/2, 380);
            
            const lineGradient = ctx.createLinearGradient(width/2 - 200, 0, width/2 + 200, 0);
            lineGradient.addColorStop(0, 'transparent');
            lineGradient.addColorStop(0.3, '#ff6b6b');
            lineGradient.addColorStop(0.7, '#ff6b6b');
            lineGradient.addColorStop(1, 'transparent');
            ctx.strokeStyle = lineGradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(width/2 - 200, 400);
            ctx.lineTo(width/2 + 200, 400);
            ctx.stroke();
            ctx.restore();
            
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 3;
            ctx.font = 'bold 32px "Arial", "Helvetica", sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText('Sampai Jumpa Kembali', width/2, 440);
            ctx.restore();
            
            ctx.save();
            ctx.font = '26px "Arial", "Helvetica", sans-serif';
            ctx.fillStyle = '#a0a0a0';
            ctx.textAlign = 'center';
            ctx.fillText(groupName.substring(0, 45), width/2, 485);
            ctx.restore();
            
            ctx.save();
            ctx.fillStyle = 'rgba(255, 100, 100, 0.12)';
            ctx.beginPath();
            ctx.roundRect(width/2 - 90, 510, 180, 42, 21);
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(width/2 - 90, 510, 180, 42, 21);
            ctx.stroke();
            
            ctx.font = 'bold 22px "Arial", "Helvetica", sans-serif';
            ctx.fillStyle = '#ff6b6b';
            ctx.textAlign = 'center';
            ctx.fillText(`${memberCount} Left`, width/2, 538);
            ctx.restore();
            
            return canvas.toBuffer('image/png');
            
        } catch (error) {
            console.error('Error creating left canvas:', error);
            return null;
        }
    }

    alip.ev.on('messages.upsert', async (message) => {
        await MessagesUpsert(alip, message, store);
    });

    alip.ev.on('group-participants.update', async (update) => {
        try {
            const { id, participants, action } = update;
            const groupData = global.db.groups[id];
            if (!groupData) return;
            
            const welcomeFile = './library/database/welcome.json';
            const leftFile = './library/database/left.json';
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            const metadata = await alip.groupMetadata(id).catch(() => null); 
            if (!metadata || !metadata.subject) return;
            
            const groupName = metadata.subject;
            const totalMember = metadata.participants?.length || 0;

            const convertJid = (jid) => {
                if (jid.endsWith('@lid')) {
                    const participant = metadata?.participants?.find(p => p.lid === jid || p.id === jid);
                    return participant && participant.jid ? participant.jid : jid;
                }
                return jid;
            };

            if (groupData.welcome && action === 'add') {
                const welcomeDB = fs.existsSync(welcomeFile) ? JSON.parse(fs.readFileSync(welcomeFile)) : {};
                
                for (let n of participants) {
                    try {
                        const finalJid = convertJid(n);
                        const profileUrl = await getProfilePicture(finalJid);
                        const pushName = metadata.participants.find(p => p.id === n)?.notify || n.split('@')[0];
                        
                        const teksWelcome = welcomeDB[id]?.welcomeText || `Halo @user, selamat datang di @group, Kamu Member ke *@totalmember*`;
                        const datenow = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY HH:mm:ss [WIB]');
                        
                        const teks = teksWelcome
                            .replace(/@user/g, `@${finalJid.split('@')[0]}`)
                            .replace(/@group/g, groupName)
                            .replace(/@totalmember/g, totalMember)
                            .replace(/@datenow/g, datenow);

                        const canvasBuffer = await createWelcomeCanvas(profileUrl, pushName, groupName, totalMember);
                        
                        let introTemplate;
                        if (global.db.groups[id] && global.db.groups[id].intro && global.db.groups[id].intro.template) {
                            introTemplate = global.db.groups[id].intro.template;
                        } else {
                            introTemplate = `╔──☉ INTRO MEMBER\n│ ✦ Nama: •••\n│ ✦ Umur: •••\n│ ✦ Gender: •••\n│ ✦ Askot: •••\n╚────────────☉`;
                        }
                        
                        const finalTeks = `${teks}`;
                        
                        if (canvasBuffer) {
                            const welcomeMsg = await generateWAMessageFromContent(id, {
                                viewOnceMessage: {
                                    message: {
                                        interactiveMessage: proto.Message.InteractiveMessage.create({
                                            contextInfo: {
                                                mentionedJid: [finalJid]
                                            },
                                            body: proto.Message.InteractiveMessage.Body.create({
                                                text: finalTeks
                                            }),
                                            footer: proto.Message.InteractiveMessage.Footer.create({
                                                text: ``
                                            }),
                                            header: proto.Message.InteractiveMessage.Header.create({
                                                hasMediaAttachment: true,
                                                imageMessage: (await prepareWAMessageMedia(
                                                    { image: canvasBuffer },
                                                    { upload: alip.waUploadToServer }
                                                )).imageMessage
                                            }),
                                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                                                buttons: [
                                                    {
                                                        name: "cta_copy",
                                                        buttonParamsJson: `{"display_text":"𝐂𝐨𝐩𝐩𝐲 𝐢𝐧𝐭𝐫𝐨","id":"copy_intro","copy_code":"${introTemplate}"}`
                                                    }
                                                ]
                                            })
                                        })
                                    }
                                }
                            }, {});
                            
                            await alip.relayMessage(id, welcomeMsg.message, { messageId: welcomeMsg.key.id });
                            
                        } else {
                            await alip.sendMessage(id, {
                                text: teks,
                                contextInfo: {
                                    mentionedJid: [finalJid],
                                    isForwarded: true,
                                    forwardingScore: 9999,
                                    businessMessageForwardInfo: { businessOwnerJid: global.owner + "@s.whatsapp.net" },
                                    forwardedNewsletterMessageInfo: { 
                                        newsletterName: global.botname,
                                        newsletterJid: global.idSaluran 
                                    },
                                    externalAdReply: {
                                        title: global.botname,
                                        body: `© Powered by ${global.namaOwner}`,
                                        thumbnailUrl: profileUrl,
                                        sourceUrl: global.linkMenu || null
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        console.log('Error sending welcome:', e);
                    }
                }
            } 
            else if (groupData.left && action === 'remove') {
                const leftDB = fs.existsSync(leftFile) ? JSON.parse(fs.readFileSync(leftFile)) : {};
                
                for (let n of participants) {
                    try {
                        const finalJid = convertJid(n);
                        const profileUrl = await getProfilePicture(finalJid);
                        const pushName = metadata.participants.find(p => p.id === n)?.notify || n.split('@')[0];
                        
                        const teksLeft = leftDB[id]?.leftText || `@user telah keluar dari @group`;
                        const datenow = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY HH:mm:ss [WIB]');
                        
                        const teks = teksLeft
                            .replace(/@user/g, `@${finalJid.split('@')[0]}`)
                            .replace(/@group/g, groupName)
                            .replace(/@totalmember/g, totalMember)
                            .replace(/@datenow/g, datenow);

                        const canvasBuffer = await createLeftCanvas(profileUrl, pushName, groupName, totalMember);
                        
                        if (canvasBuffer) {
                            await alip.sendMessage(id, {
                                image: canvasBuffer,
                                caption: teks,
                                contextInfo: {
                                    mentionedJid: [finalJid],
                                    isForwarded: true,
                                    forwardingScore: 9999,
                                    businessMessageForwardInfo: { businessOwnerJid: global.owner + "@s.whatsapp.net" },
                                    forwardedNewsletterMessageInfo: { 
                                        newsletterName: global.botname,
                                        newsletterJid: global.idSaluran 
                                    }
                                }
                            });
                        } else {
                            await alip.sendMessage(id, {
                                text: teks,
                                contextInfo: {
                                    mentionedJid: [finalJid],
                                    isForwarded: true,
                                    forwardingScore: 9999,
                                    businessMessageForwardInfo: { businessOwnerJid: global.owner + "@s.whatsapp.net" },
                                    forwardedNewsletterMessageInfo: { 
                                        newsletterName: global.botname,
                                        newsletterJid: global.idSaluran 
                                    },
                                    externalAdReply: {
                                        title: global.botname,
                                        body: `© Powered by ${global.namaOwner}`,
                                        thumbnailUrl: profileUrl,
                                        sourceUrl: global.linkMenu || null
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        console.log('Error sending left:', e);
                    }
                }
            }
            else if (action === 'promote') {
                for (let n of participants) {
                    const finalJid = convertJid(n);
                    const datenow = moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm');
                    let teks = `𐔈⃘ ֹ ׅ 🍓 ֹ *Grup Notification* ֹ ׅ ୫\n╭╼─┈───┈──⏣╼╯\n┆✿᪲ ׄ𖹭₊ *Event* : Promote Admin\n┆✿᪲ ׄ𖹭₊ *Member* : @${finalJid.split('@')[0]}\n┆✿᪲ ׄ𖹭₊ *Grup* : ${groupName}\n┆✿᪲ ׄ𖹭₊ *Waktu* : ${datenow}\n╰─╼𔕬─┈───┈───┈`;
                    await sendGroupNotif(id, teks, [finalJid]);
                }
            } 
            else if (action === 'demote') {
                for (let n of participants) {
                    const finalJid = convertJid(n);
                    const datenow = moment().tz('Asia/Jakarta').format('DD/MM/YYYY HH:mm');
                    let teks = `𐔈⃘ ֹ ׅ 🍓 ֹ *Grup Notification* ֹ ׅ ୫\n╭╼─┈───┈──⏣╼╯\n┆✿᪲ ׄ𖹭₊ *Event* : Demote Admin\n┆✿᪲ ׄ𖹭₊ *Member* : @${finalJid.split('@')[0]}\n┆✿᪲ ׄ𖹭₊ *Grup* : ${groupName}\n┆✿᪲ ׄ𖹭₊ *Waktu* : ${datenow}\n╰─╼𔕬─┈───┈───┈`;
                    await sendGroupNotif(id, teks, [finalJid]);
                }
            }

        } catch (err) {
            console.log('Error di handler group-participants.update:', err);
        }
    });
}

module.exports = { initializerHandler };

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(chalk.redBright(`Update ${__filename}`));
    delete require.cache[file];
    require(file);
});
