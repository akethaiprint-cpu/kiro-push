/**
 * Storage Manager
 * จัดการ localStorage + sync กับ Google Sheets
 * Module Pattern (object literal) for browser, also export for Vitest testing
 */
const StorageManager = {
  STORAGE_KEY: 'tp_priceTable',

  /**
   * โหลด Price Table จาก localStorage
   * ถ้าไม่มีข้อมูลหรือข้อมูลเสียหาย จะ fallback ไปใช้ default
   * @returns {object} Price table data
   */
  loadPriceTable() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) {
        return this.getDefaultPriceTable();
      }
      const data = JSON.parse(raw);
      if (this.validatePriceTableStructure(data)) {
        return data;
      }
      // Invalid structure — discard and use defaults
      console.warn('StorageManager: localStorage data has invalid structure, using defaults');
      localStorage.removeItem(this.STORAGE_KEY);
      return this.getDefaultPriceTable();
    } catch (e) {
      // Corrupted JSON or localStorage error — discard and use defaults
      console.warn('StorageManager: localStorage corrupted, using defaults', e);
      try {
        localStorage.removeItem(this.STORAGE_KEY);
      } catch (_) { /* ignore */ }
      return this.getDefaultPriceTable();
    }
  },

  /**
   * บันทึก Price Table ลง localStorage
   * @param {object} priceTable
   */
  savePriceTable(priceTable) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(priceTable));
    } catch (e) {
      console.error('StorageManager: Failed to save to localStorage', e);
    }
  },

  /**
   * Validate price table structure
   * ตรวจสอบว่า data มีโครงสร้างถูกต้อง (มีทั้ง 4 ระบบพิมพ์ และ product types ที่จำเป็น)
   * @param {object} data
   * @returns {boolean}
   */
  validatePriceTableStructure(data) {
    if (!data || typeof data !== 'object') return false;

    const requiredSystems = {
      screen: ['sticker', 'box', 'fabricBag', 'label'],
      digitalOffset: ['sticker', 'label', 'boxSmall', 'businessCard'],
      industrialOffset: ['sticker', 'label', 'box', 'brochure', 'leaflet', 'book', 'catalog'],
      inkjet: ['vinylSign', 'largeSticker', 'banner', 'poster']
    };

    for (const [system, productTypes] of Object.entries(requiredSystems)) {
      if (!data[system] || typeof data[system] !== 'object') return false;
      for (const pt of productTypes) {
        if (!data[system][pt] || typeof data[system][pt] !== 'object') return false;
      }
    }

    return true;
  },

  /**
   * Get default price table (hardcoded fallback)
   * ราคาเริ่มต้นสำหรับทุกระบบพิมพ์และประเภทสินค้า
   * @returns {object}
   */
  getDefaultPriceTable() {
    return {
      version: "1.0",
      lastUpdated: new Date().toISOString(),

      screen: {
        sticker: {
          plateCost: 800,
          printCostPerColor: {
            tiers: [
              { minQty: 100, maxQty: 500, pricePerUnit: 1.50 },
              { minQty: 501, maxQty: 1000, pricePerUnit: 1.00 },
              { minQty: 1001, maxQty: 5000, pricePerUnit: 0.60 },
              { minQty: 5001, maxQty: 1000000, pricePerUnit: 0.35 }
            ]
          },
          materials: {
            paper: { name: "กระดาษ", pricePerSqCm: 0.005 },
            pvc: { name: "PVC", pricePerSqCm: 0.012 },
            pp: { name: "PP", pricePerSqCm: 0.010 },
            pet: { name: "PET", pricePerSqCm: 0.015 },
            foil: { name: "ฟอยล์", pricePerSqCm: 0.020 }
          }
        },
        box: {
          plateCost: 1200,
          printCostPerColor: {
            tiers: [
              { minQty: 100, maxQty: 500, pricePerUnit: 2.50 },
              { minQty: 501, maxQty: 1000, pricePerUnit: 1.80 },
              { minQty: 1001, maxQty: 5000, pricePerUnit: 1.20 },
              { minQty: 5001, maxQty: 100000, pricePerUnit: 0.80 }
            ]
          },
          materials: {
            artCard300: { name: "กระดาษอาร์ท 300 แกรม", pricePerSqCm: 0.008 },
            artCard350: { name: "กระดาษอาร์ท 350 แกรม", pricePerSqCm: 0.010 },
            duplex: { name: "กระดาษกล่องแข็ง", pricePerSqCm: 0.012 },
            corrugated: { name: "กระดาษลูกฟูก", pricePerSqCm: 0.015 }
          },
          dieCutCost: {
            tiers: [
              { minArea: 0, maxArea: 500, cost: 1500 },
              { minArea: 501, maxArea: 2000, cost: 2500 },
              { minArea: 2001, maxArea: 10000, cost: 4000 }
            ]
          }
        },
        fabricBag: {
          plateCost: 600,
          printCostPerColor: {
            tiers: [
              { minQty: 1, maxQty: 100, pricePerUnit: 8.00 },
              { minQty: 101, maxQty: 500, pricePerUnit: 5.00 },
              { minQty: 501, maxQty: 1000, pricePerUnit: 3.50 },
              { minQty: 1001, maxQty: 100000, pricePerUnit: 2.00 }
            ]
          },
          materials: {
            cotton: {
              name: "ผ้าดิบ",
              pricePerBag: {
                tiers: [
                  { minSize: 0, maxSize: 900, price: 15 },
                  { minSize: 901, maxSize: 2500, price: 25 },
                  { minSize: 2501, maxSize: 10000, price: 40 }
                ]
              }
            },
            spunbond: {
              name: "ผ้าสปันบอนด์",
              pricePerBag: {
                tiers: [
                  { minSize: 0, maxSize: 900, price: 8 },
                  { minSize: 901, maxSize: 2500, price: 12 },
                  { minSize: 2501, maxSize: 10000, price: 18 }
                ]
              }
            },
            canvas: {
              name: "ผ้าแคนวาส",
              pricePerBag: {
                tiers: [
                  { minSize: 0, maxSize: 900, price: 25 },
                  { minSize: 901, maxSize: 2500, price: 40 },
                  { minSize: 2501, maxSize: 10000, price: 60 }
                ]
              }
            }
          }
        },
        label: {
          plateCost: 800,
          printCostPerColor: {
            tiers: [
              { minQty: 100, maxQty: 500, pricePerUnit: 1.20 },
              { minQty: 501, maxQty: 1000, pricePerUnit: 0.80 },
              { minQty: 1001, maxQty: 5000, pricePerUnit: 0.50 },
              { minQty: 5001, maxQty: 1000000, pricePerUnit: 0.30 }
            ]
          },
          materials: {
            artPaper: { name: "กระดาษอาร์ท", pricePerSqCm: 0.006 },
            bondPaper: { name: "กระดาษปอนด์", pricePerSqCm: 0.004 },
            pvc: { name: "PVC", pricePerSqCm: 0.012 },
            pp: { name: "PP", pricePerSqCm: 0.010 },
            pet: { name: "PET", pricePerSqCm: 0.015 }
          }
        }
      },

      digitalOffset: {
        sticker: {
          perSheetPrice: {
            tiers: [
              { minQty: 1, maxQty: 100, pricePerSheet: 12.00 },
              { minQty: 101, maxQty: 500, pricePerSheet: 8.00 },
              { minQty: 501, maxQty: 1000, pricePerSheet: 5.50 },
              { minQty: 1001, maxQty: 10000, pricePerSheet: 4.00 }
            ]
          },
          materials: {
            artPaper: { name: "กระดาษอาร์ท", pricePerSqCm: 0.007 },
            stickerPaper: { name: "กระดาษสติกเกอร์", pricePerSqCm: 0.010 },
            pvc: { name: "PVC", pricePerSqCm: 0.014 },
            pp: { name: "PP", pricePerSqCm: 0.012 }
          },
          finishing: {
            laminate: { name: "เคลือบลามิเนต", pricePerSqCm: 0.003 },
            dieCut: { name: "ไดคัท", pricePerPiece: 0.50 },
            emboss: { name: "ปั๊มนูน", pricePerPiece: 1.00 }
          }
        },
        label: {
          perSheetPrice: {
            tiers: [
              { minQty: 1, maxQty: 100, pricePerSheet: 10.00 },
              { minQty: 101, maxQty: 500, pricePerSheet: 7.00 },
              { minQty: 501, maxQty: 1000, pricePerSheet: 5.00 },
              { minQty: 1001, maxQty: 10000, pricePerSheet: 3.50 }
            ]
          },
          materials: {
            artPaper: { name: "กระดาษอาร์ท", pricePerSqCm: 0.007 },
            stickerPaper: { name: "กระดาษสติกเกอร์", pricePerSqCm: 0.010 },
            pvc: { name: "PVC", pricePerSqCm: 0.014 },
            pp: { name: "PP", pricePerSqCm: 0.012 }
          },
          finishing: {
            laminate: { name: "เคลือบลามิเนต", pricePerSqCm: 0.003 },
            dieCut: { name: "ไดคัท", pricePerPiece: 0.50 },
            emboss: { name: "ปั๊มนูน", pricePerPiece: 1.00 }
          }
        },
        boxSmall: {
          perSheetPrice: {
            tiers: [
              { minQty: 1, maxQty: 50, pricePerSheet: 25.00 },
              { minQty: 51, maxQty: 200, pricePerSheet: 18.00 },
              { minQty: 201, maxQty: 500, pricePerSheet: 14.00 },
              { minQty: 501, maxQty: 5000, pricePerSheet: 10.00 }
            ]
          },
          materials: {
            artCard: { name: "กระดาษอาร์ท", pricePerSqCm: 0.009 },
            hardBoard: { name: "กระดาษกล่องแข็ง", pricePerSqCm: 0.013 },
            corrugated: { name: "กระดาษลูกฟูก", pricePerSqCm: 0.016 }
          },
          finishing: {
            laminate: { name: "เคลือบลามิเนต", pricePerSqCm: 0.004 },
            embossStamp: { name: "ปั๊มเค", pricePerPiece: 2.00 },
            dieCut: { name: "ไดคัท", pricePerPiece: 1.50 }
          }
        },
        businessCard: {
          sizes: ["9.0x5.5", "9.0x5.0"],
          perSheetPrice: {
            tiers: [
              { minQty: 50, maxQty: 200, pricePerSheet: 5.00 },
              { minQty: 201, maxQty: 500, pricePerSheet: 3.50 },
              { minQty: 501, maxQty: 1000, pricePerSheet: 2.50 },
              { minQty: 1001, maxQty: 5000, pricePerSheet: 2.00 }
            ]
          },
          materials: {
            art260: { name: "กระดาษอาร์ท 260 แกรม", pricePerCard: 0.50 },
            art300: { name: "กระดาษอาร์ท 300 แกรม", pricePerCard: 0.70 },
            special: { name: "กระดาษพิเศษ", pricePerCard: 1.50 }
          },
          finishing: {
            laminateMatte: { name: "เคลือบลามิเนตด้าน", pricePerCard: 0.30 },
            laminateGlossy: { name: "เคลือบลามิเนตเงา", pricePerCard: 0.30 },
            spotUV: { name: "Spot UV", pricePerCard: 0.80 },
            emboss: { name: "ปั๊มนูน", pricePerCard: 1.00 }
          }
        }
      },

      industrialOffset: {
        sticker: {
          plateCostPerColor: 2500,
          printCost: {
            tiers: [
              { minQty: 1000, maxQty: 5000, pricePerUnit: 0.40 },
              { minQty: 5001, maxQty: 10000, pricePerUnit: 0.25 },
              { minQty: 10001, maxQty: 50000, pricePerUnit: 0.15 },
              { minQty: 50001, maxQty: 1000000, pricePerUnit: 0.08 }
            ]
          },
          materials: {
            artPaper: { name: "กระดาษอาร์ท", pricePerSqCm: 0.004 },
            pvc: { name: "PVC", pricePerSqCm: 0.010 },
            pp: { name: "PP", pricePerSqCm: 0.008 },
            pet: { name: "PET", pricePerSqCm: 0.012 },
            foil: { name: "ฟอยล์", pricePerSqCm: 0.018 }
          },
          finishing: {
            laminate: { name: "เคลือบลามิเนต", pricePerSqCm: 0.002 },
            dieCut: { name: "ไดคัท", pricePerPiece: 0.30 },
            emboss: { name: "ปั๊มนูน", pricePerPiece: 0.50 }
          }
        },
        label: {
          plateCostPerColor: 2500,
          printCost: {
            tiers: [
              { minQty: 1000, maxQty: 5000, pricePerUnit: 0.35 },
              { minQty: 5001, maxQty: 10000, pricePerUnit: 0.22 },
              { minQty: 10001, maxQty: 50000, pricePerUnit: 0.12 },
              { minQty: 50001, maxQty: 1000000, pricePerUnit: 0.07 }
            ]
          },
          materials: {
            artPaper: { name: "กระดาษอาร์ท", pricePerSqCm: 0.004 },
            bondPaper: { name: "กระดาษปอนด์", pricePerSqCm: 0.003 },
            pvc: { name: "PVC", pricePerSqCm: 0.010 },
            pp: { name: "PP", pricePerSqCm: 0.008 },
            pet: { name: "PET", pricePerSqCm: 0.012 }
          },
          finishing: {
            laminate: { name: "เคลือบลามิเนต", pricePerSqCm: 0.002 },
            dieCut: { name: "ไดคัท", pricePerPiece: 0.30 },
            emboss: { name: "ปั๊มนูน", pricePerPiece: 0.50 },
            spotUV: { name: "Spot UV", pricePerSqCm: 0.005 }
          }
        },
        box: {
          plateCostPerColor: 3000,
          printCost: {
            tiers: [
              { minQty: 1000, maxQty: 5000, pricePerUnit: 0.80 },
              { minQty: 5001, maxQty: 10000, pricePerUnit: 0.50 },
              { minQty: 10001, maxQty: 50000, pricePerUnit: 0.30 },
              { minQty: 50001, maxQty: 100000, pricePerUnit: 0.18 }
            ]
          },
          materials: {
            artCard: { name: "กระดาษอาร์ท", pricePerSqCm: 0.006 },
            hardBoard: { name: "กระดาษกล่องแข็ง", pricePerSqCm: 0.010 },
            corrugated: { name: "กระดาษลูกฟูก", pricePerSqCm: 0.013 }
          },
          finishing: {
            laminate: { name: "เคลือบลามิเนต", pricePerSqCm: 0.003 },
            embossStamp: { name: "ปั๊มเค", pricePerPiece: 1.50 },
            dieCut: { name: "ไดคัท", pricePerPiece: 1.00 },
            emboss: { name: "ปั๊มนูน", pricePerPiece: 0.80 }
          }
        },
        brochure: {
          plateCostPerColor: 2500,
          printCost: {
            tiers: [
              { minQty: 500, maxQty: 2000, pricePerUnit: 0.60 },
              { minQty: 2001, maxQty: 5000, pricePerUnit: 0.35 },
              { minQty: 5001, maxQty: 20000, pricePerUnit: 0.20 },
              { minQty: 20001, maxQty: 100000, pricePerUnit: 0.12 }
            ]
          },
          paperTypes: {
            artMatte128: { name: "อาร์ทด้าน 128 แกรม", pricePerSheet: 1.20 },
            artGlossy128: { name: "อาร์ทเงา 128 แกรม", pricePerSheet: 1.20 },
            artMatte157: { name: "อาร์ทด้าน 157 แกรม", pricePerSheet: 1.50 },
            artGlossy157: { name: "อาร์ทเงา 157 แกรม", pricePerSheet: 1.50 }
          },
          standardSizes: ["A5", "A4", "A3"],
          finishing: {
            laminate: { name: "เคลือบลามิเนต", pricePerSheet: 1.00 },
            spotUV: { name: "Spot UV", pricePerSheet: 2.00 },
            emboss: { name: "ปั๊มนูน", pricePerPiece: 0.80 },
            dieCut: { name: "ไดคัท", pricePerPiece: 0.50 }
          }
        },
        leaflet: {
          plateCostPerColor: 2500,
          printCost: {
            tiers: [
              { minQty: 500, maxQty: 2000, pricePerUnit: 0.50 },
              { minQty: 2001, maxQty: 5000, pricePerUnit: 0.30 },
              { minQty: 5001, maxQty: 20000, pricePerUnit: 0.18 },
              { minQty: 20001, maxQty: 100000, pricePerUnit: 0.10 }
            ]
          },
          paperTypes: {
            artMatte128: { name: "อาร์ทด้าน 128 แกรม", pricePerSheet: 1.00 },
            artGlossy128: { name: "อาร์ทเงา 128 แกรม", pricePerSheet: 1.00 },
            artMatte157: { name: "อาร์ทด้าน 157 แกรม", pricePerSheet: 1.30 },
            artGlossy157: { name: "อาร์ทเงา 157 แกรม", pricePerSheet: 1.30 }
          },
          standardSizes: ["A5", "A4", "A3"],
          finishing: {
            laminate: { name: "เคลือบลามิเนต", pricePerSheet: 1.00 },
            spotUV: { name: "Spot UV", pricePerSheet: 2.00 },
            emboss: { name: "ปั๊มนูน", pricePerPiece: 0.80 },
            dieCut: { name: "ไดคัท", pricePerPiece: 0.50 }
          }
        },
        book: {
          plateCostPerColor: 2500,
          printCost: {
            tiers: [
              { minQty: 500, maxQty: 2000, pricePerUnit: 0.80 },
              { minQty: 2001, maxQty: 5000, pricePerUnit: 0.50 },
              { minQty: 5001, maxQty: 20000, pricePerUnit: 0.30 },
              { minQty: 20001, maxQty: 100000, pricePerUnit: 0.18 }
            ]
          },
          paperTypes: {
            artMatte128: { name: "อาร์ทด้าน 128 แกรม", pricePerSheet: 1.20 },
            artGlossy128: { name: "อาร์ทเงา 128 แกรม", pricePerSheet: 1.20 },
            bond80: { name: "ปอนด์ 80 แกรม", pricePerSheet: 0.60 },
            bond100: { name: "ปอนด์ 100 แกรม", pricePerSheet: 0.80 }
          },
          bindingTypes: {
            perfectBind: { name: "ไสกาว", costPerPage: 0.15 },
            saddleStitch: { name: "เย็บมุงหลังคา", costPerPage: 0.10 },
            spiralBind: { name: "สันห่วง", costPerPage: 0.20 }
          },
          finishing: {
            laminate: { name: "เคลือบลามิเนต (ปก)", pricePerPiece: 3.00 },
            spotUV: { name: "Spot UV (ปก)", pricePerPiece: 5.00 },
            emboss: { name: "ปั๊มนูน (ปก)", pricePerPiece: 2.00 }
          }
        },
        catalog: {
          plateCostPerColor: 2500,
          printCost: {
            tiers: [
              { minQty: 500, maxQty: 2000, pricePerUnit: 0.90 },
              { minQty: 2001, maxQty: 5000, pricePerUnit: 0.55 },
              { minQty: 5001, maxQty: 20000, pricePerUnit: 0.35 },
              { minQty: 20001, maxQty: 100000, pricePerUnit: 0.20 }
            ]
          },
          paperTypes: {
            artMatte128: { name: "อาร์ทด้าน 128 แกรม", pricePerSheet: 1.20 },
            artGlossy128: { name: "อาร์ทเงา 128 แกรม", pricePerSheet: 1.20 },
            artMatte157: { name: "อาร์ทด้าน 157 แกรม", pricePerSheet: 1.50 },
            artGlossy157: { name: "อาร์ทเงา 157 แกรม", pricePerSheet: 1.50 }
          },
          bindingTypes: {
            perfectBind: { name: "ไสกาว", costPerPage: 0.15 },
            saddleStitch: { name: "เย็บมุงหลังคา", costPerPage: 0.10 },
            spiralBind: { name: "สันห่วง", costPerPage: 0.20 }
          },
          finishing: {
            laminate: { name: "เคลือบลามิเนต (ปก)", pricePerPiece: 3.00 },
            spotUV: { name: "Spot UV (ปก)", pricePerPiece: 5.00 },
            emboss: { name: "ปั๊มนูน (ปก)", pricePerPiece: 2.00 }
          }
        }
      },

      inkjet: {
        vinylSign: {
          pricePerSqM: {
            "720dpi": 120,
            "1440dpi": 180
          },
          media: {
            glossyVinyl: { name: "ไวนิลเงา", pricePerSqM: 180 },
            matteVinyl: { name: "ไวนิลด้าน", pricePerSqM: 200 },
            perforatedVinyl: { name: "ไวนิลทะลุ", pricePerSqM: 280 },
            koreanVinyl: { name: "ไวนิลเกาหลี", pricePerSqM: 250 }
          },
          finishing: {
            uvCoating: { name: "เคลือบ UV", pricePerSqM: 50 },
            eyelet: { name: "เข้าตาไก่", pricePerMeter: 30 },
            hemming: { name: "เย็บขอบ", pricePerMeter: 25 },
            woodFrame: { name: "ติดโครงไม้", pricePerSqM: 150 }
          }
        },
        largeSticker: {
          pricePerSqM: {
            "720dpi": 150,
            "1440dpi": 220
          },
          media: {
            whiteStickerMedia: { name: "สติกเกอร์ขาว", pricePerSqM: 200 },
            clearStickerMedia: { name: "สติกเกอร์ใส", pricePerSqM: 250 },
            oneWayStickerMedia: { name: "สติกเกอร์วันเวย์", pricePerSqM: 350 },
            carWrapStickerMedia: { name: "สติกเกอร์พื้นรถ", pricePerSqM: 400 }
          },
          finishing: {
            uvCoating: { name: "เคลือบ UV", pricePerSqM: 50 },
            laminate: { name: "เคลือบลามิเนต", pricePerSqM: 60 },
            dieCut: { name: "ไดคัท", pricePerSqM: 40 }
          }
        },
        banner: {
          pricePerSqM: {
            "720dpi": 100,
            "1440dpi": 160
          },
          media: {
            bannerFabric: { name: "ผ้าแบนเนอร์", pricePerSqM: 150 },
            canvasFabric: { name: "ผ้าใบ", pricePerSqM: 220 },
            satinFabric: { name: "ผ้าซาติน", pricePerSqM: 280 }
          },
          finishing: {
            uvCoating: { name: "เคลือบ UV", pricePerSqM: 50 },
            eyelet: { name: "เข้าตาไก่", pricePerMeter: 30 },
            hemming: { name: "เย็บขอบ", pricePerMeter: 25 },
            woodFrame: { name: "ติดโครงไม้", pricePerSqM: 150 }
          }
        },
        poster: {
          pricePerSqM: {
            "720dpi": 130,
            "1440dpi": 200
          },
          media: {
            photoPaper: { name: "กระดาษโฟโต้", pricePerSqM: 180 },
            artPaper: { name: "กระดาษอาร์ท", pricePerSqM: 150 },
            ppAdhesive: { name: "PP กาว", pricePerSqM: 220 }
          },
          finishing: {
            uvCoating: { name: "เคลือบ UV", pricePerSqM: 50 },
            laminate: { name: "เคลือบลามิเนต", pricePerSqM: 60 },
            woodFrame: { name: "ติดโครงไม้", pricePerSqM: 150 }
          }
        }
      }
    };
  },

  // Google Apps Script URL for price table sync
  // Replace with actual deployed URL from Google Apps Script
  SHEETS_API_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',

  /**
   * Export Price Table เป็น JSON file (downloadable)
   * สร้างไฟล์ JSON ที่มีข้อมูล Price Table ทั้งหมดและ trigger download
   * Requirements: 13.4
   */
  exportJSON() {
    try {
      const priceTable = this.loadPriceTable();
      const exportData = {
        exportDate: new Date().toISOString(),
        version: priceTable.version || '1.0',
        priceTable: priceTable
      };
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `thaiprint-pricetable-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (e) {
      console.error('StorageManager: Export failed', e);
      return { success: false, error: 'ไม่สามารถส่งออกข้อมูลได้: ' + e.message };
    }
  },

  /**
   * Import Price Table จาก JSON file
   * ตรวจสอบความถูกต้องของไฟล์ก่อนโหลดเข้าระบบ
   * @param {File} file - ไฟล์ JSON ที่ต้องการ import
   * @returns {Promise<ImportResult>}
   * Requirements: 13.5, 13.6
   */
  importJSON(file) {
    return new Promise((resolve) => {
      // Validate file type
      if (!file || !(file instanceof File || (file.name && file.size !== undefined))) {
        resolve({ success: false, error: 'ไฟล์ไม่ถูกต้อง: กรุณาเลือกไฟล์ JSON' });
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const parsed = JSON.parse(content);

          // Support both wrapped format (with exportDate + priceTable) and raw format
          let priceTableData;
          if (parsed.priceTable && typeof parsed.priceTable === 'object') {
            priceTableData = parsed.priceTable;
          } else {
            priceTableData = parsed;
          }

          // Validate structure
          if (!this.validatePriceTableStructure(priceTableData)) {
            resolve({
              success: false,
              error: 'ไฟล์ไม่ถูกต้อง: โครงสร้างข้อมูลไม่ครบถ้วน ต้องมีข้อมูลทั้ง 4 ระบบพิมพ์ (screen, digitalOffset, industrialOffset, inkjet) และประเภทสินค้าทั้งหมด'
            });
            return;
          }

          // Update lastUpdated timestamp
          priceTableData.lastUpdated = new Date().toISOString();

          // Save to localStorage
          this.savePriceTable(priceTableData);

          resolve({ success: true, data: priceTableData });
        } catch (e) {
          if (e instanceof SyntaxError) {
            resolve({ success: false, error: 'ไฟล์ไม่ถูกต้อง: ไฟล์ไม่ใช่ JSON ที่ถูกต้อง' });
          } else {
            resolve({ success: false, error: 'ไฟล์ไม่ถูกต้อง: ' + e.message });
          }
        }
      };

      reader.onerror = () => {
        resolve({ success: false, error: 'ไฟล์ไม่ถูกต้อง: ไม่สามารถอ่านไฟล์ได้' });
      };

      reader.readAsText(file);
    });
  },

  /**
   * Sync กับ Google Sheets (fetch latest price table)
   * ใช้ AbortController สำหรับ timeout
   * @param {number} timeout - Timeout in ms (default 10000)
   * @returns {Promise<object|null>} - Price table data or null on failure
   * Requirements: 10.1, 10.6
   */
  async syncFromSheets(timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(this.SHEETS_API_URL + '?action=getPriceTable', {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn('StorageManager: Google Sheets sync failed with status', response.status);
        return null;
      }

      const data = await response.json();

      // Validate the received data
      let priceTableData;
      if (data.priceTable && typeof data.priceTable === 'object') {
        priceTableData = data.priceTable;
      } else if (data.screen && data.digitalOffset) {
        priceTableData = data;
      } else {
        console.warn('StorageManager: Invalid data received from Google Sheets');
        return null;
      }

      if (!this.validatePriceTableStructure(priceTableData)) {
        console.warn('StorageManager: Google Sheets data has invalid structure');
        return null;
      }

      // Save synced data to localStorage
      priceTableData.lastUpdated = new Date().toISOString();
      this.savePriceTable(priceTableData);

      return priceTableData;
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        console.warn('StorageManager: Google Sheets sync timed out after ' + timeout + 'ms');
      } else {
        console.warn('StorageManager: Google Sheets sync failed', e.message);
      }
      return null;
    }
  },
};

// Export for testing (Node.js/Vitest)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}
