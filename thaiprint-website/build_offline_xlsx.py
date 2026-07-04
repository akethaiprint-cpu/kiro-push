"""
สร้างไฟล์ Excel คำนวณราคาออฟไลน์ — Thai Print Inter Group
สูตร/ราคาตรงกับเว็บ (เผื่อเสีย 300 ใบ/ด้าน, กระดาษ×แกรม×markup 1.20, สติ๊กเกอร์ ppc รวม markup,
งาน 2 ด้าน W&T/Sheetwise, เลือกเครื่องถูกกว่า ตัด4/ตัด2)
ชีต: Offset / Inkjet / Prices(แก้ราคาได้)
"""
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation

TH = "TH Sarabun New"
HFILL = PatternFill("solid", fgColor="1F4E79")
SEC   = PatternFill("solid", fgColor="D9E1F2")
INP   = PatternFill("solid", fgColor="FFF2CC")
RES   = PatternFill("solid", fgColor="C6EFCE")
GREY  = PatternFill("solid", fgColor="F2F2F2")
Hf = Font(name=TH, size=14, bold=True, color="FFFFFF")
B  = Font(name=TH, size=13, bold=True)
Nf = Font(name=TH, size=13)
Sm = Font(name=TH, size=11, color="808080")
Big= Font(name=TH, size=20, bold=True, color="C0504D")
thin = Side(style="thin", color="BFBFBF")
BORD = Border(left=thin, right=thin, top=thin, bottom=thin)

wb = Workbook()

# ============ PRICES SHEET ============
p = wb.active; p.title = "Prices"
p.sheet_view.showGridLines = False
def sc(ws,cell,val,font=Nf,fill=None,align=None,border=None,numfmt=None):
    c=ws[cell]; c.value=val; c.font=font
    if fill: c.fill=fill
    if align: c.alignment=Alignment(horizontal=align)
    if border: c.border=border
    if numfmt: c.number_format=numfmt
    return c

sc(p,"A1","ตารางราคา (แก้ไขได้ — ช่องเหลืองคือค่าที่ปรับได้)",Hf,HFILL); p.merge_cells("A1:E1")
sc(p,"A3","Markup กระดาษ"); sc(p,"B3",1.20,Nf,INP)
sc(p,"A4","เผื่อเสีย/ด้าน (ใบพิมพ์)"); sc(p,"B4",300,Nf,INP)
sc(p,"A5","ค่าเพลท ตัด4 (บ./สี)"); sc(p,"B5",300,Nf,INP)
sc(p,"A6","ค่าเพลท ตัด2 (บ./สี)"); sc(p,"B6",600,Nf,INP)

sc(p,"A9","เรตค่าพิมพ์ (บ./สี)",B,SEC); p.merge_cells("A9:D9")
for i,h in enumerate(["คีย์","เหมา/สี","ช่วงเหมา (ใบ)","เกิน (บ./ใบ)"]):
    sc(p,f"{'ABCD'[i]}10",h,B,GREY,border=BORD)
rate_rows = [
    ("cut4_conventional",900,10000,0.10),
    ("cut4_uv",1500,1000,1.00),
    ("cut2_conventional",1200,10000,0.20),
    ("cut2_uv",2000,10000,1.50),
]
for r,(k,fl,up,ov) in enumerate(rate_rows, start=11):
    sc(p,f"A{r}",k,Nf,border=BORD); sc(p,f"B{r}",fl,Nf,INP,border=BORD)
    sc(p,f"C{r}",up,Nf,INP,border=BORD); sc(p,f"D{r}",ov,Nf,INP,border=BORD,numfmt="0.00")

sc(p,"A17","วัสดุ (กระดาษ = คิดตามแกรม×บ./กก.; สติ๊กเกอร์ = บ./ตร.ซม. รวม markup แล้ว)",B,SEC); p.merge_cells("A17:E17")
for i,h in enumerate(["ชื่อวัสดุ","ชนิด","บ./กก.","บ./ตร.ซม.","หมึก"]):
    sc(p,f"{'ABCDE'[i]}18",h,B,GREY,border=BORD)
materials = [
    ("อาร์ตมัน","paper",32,None,"conventional"),
    ("อาร์ตด้าน","paper",32,None,"conventional"),
    ("อาร์ตการ์ด 2 หน้า","paper",34,None,"conventional"),
    ("อาร์ตการ์ด 1 หน้า (ไอวอรี่)","paper",32,None,"conventional"),
    ("กระดาษการ์ดขาว","paper",34.5,None,"conventional"),
    ("กระดาษปอนด์","paper",30,None,"conventional"),
    ("กล่องแป้งหลังเทา","paper",23,None,"conventional"),
    ("ไวท์คราฟท์","paper",40,None,"conventional"),
    ("สติ๊กเกอร์กระดาษ","sticker",None,0.002911,"conventional"),
    ("สติ๊กเกอร์ PVC","sticker",None,0.004528,"uv"),
    ("สติ๊กเกอร์ PP ขาวเงา","sticker",None,0.003720,"uv"),
    ("สติ๊กเกอร์ PP ขาวด้าน","sticker",None,0.003922,"uv"),
    ("สติ๊กเกอร์ PP ขาวเงา หลังขาว","sticker",None,0.002385,"uv"),
    ("สติ๊กเกอร์ PP ขาวด้าน หลังขาว","sticker",None,0.002102,"uv"),
    ("สติ๊กเกอร์ PET","sticker",None,0.005175,"uv"),
    ("สติ๊กเกอร์ฟอยล์","sticker",None,0.007278,"uv"),
]
mstart=19
for r,(nm,ty,ppk,ppc,ink) in enumerate(materials, start=mstart):
    sc(p,f"A{r}",nm,Nf,border=BORD); sc(p,f"B{r}",ty,Nf,border=BORD)
    sc(p,f"C{r}",ppk if ppk is not None else "",Nf,INP,border=BORD)
    sc(p,f"D{r}",ppc if ppc is not None else "",Nf,INP,border=BORD,numfmt="0.000000")
    sc(p,f"E{r}",ink,Nf,border=BORD)
mend=mstart+len(materials)-1

# Inkjet tables
sc(p,"A37","อิงค์เจ็ท (บ./ตร.ม.)",B,SEC); p.merge_cells("A37:D37")
sc(p,"A38","ไวนิล: ช่วง(≤ตร.ม.) / 720 / 1440",Sm); 
sc(p,"A39",10,Nf,INP); sc(p,"B39",180,Nf,INP); sc(p,"C39",220,Nf,INP)
sc(p,"A40",100000,Nf,INP); sc(p,"B40",120,Nf,INP); sc(p,"C40",150,Nf,INP)
sc(p,"A41","สติ๊กเกอร์ PVC ใหญ่: ช่วง / 720 / 1440",Sm)
sc(p,"A42",10,Nf,INP); sc(p,"B42",150,Nf,INP); sc(p,"C42",190,Nf,INP)
sc(p,"A43",100000,Nf,INP); sc(p,"B43",110,Nf,INP); sc(p,"C43",150,Nf,INP)
sc(p,"A44","วัสดุอื่น: ชื่อ / ปกติ / ด่วน",Sm)
sc(p,"A45","โฟโต้เปเปอร์",Nf); sc(p,"B45",250,Nf,INP); sc(p,"C45",350,Nf,INP)
sc(p,"A46","ผ้าแคนวาส",Nf); sc(p,"B46",400,Nf,INP); sc(p,"C46",550,Nf,INP)
sc(p,"A47","ผ้าป้าย/Backdrop",Nf); sc(p,"B47",300,Nf,INP); sc(p,"C47",420,Nf,INP)

for col,w in {"A":34,"B":13,"C":15,"D":13,"E":16}.items(): p.column_dimensions[col].width=w

# ============ OFFSET SHEET ============
o = wb.create_sheet("Offset"); o.sheet_view.showGridLines=False
sc(o,"A1","คำนวณราคางานพิมพ์ Offset",Hf,HFILL); o.merge_cells("A1:F1")
sc(o,"A2","กรอกช่องเหลือง → ระบบเลือกเครื่องถูกกว่าให้ (ตัด4/ตัด2)",Sm); o.merge_cells("A2:F2")

inp = [
 ("A4","วัสดุ","B4","สติ๊กเกอร์ PVC"),
 ("A5","แกรม (เฉพาะกระดาษ)","B5",128),
 ("A6","กว้าง (ซม.)","B6",10),
 ("A7","สูง (ซม.)","B7",10),
 ("A8","สีด้านหน้า","B8",4),
 ("A9","สีด้านหลัง (0 = หน้าเดียว)","B9",0),
 ("A10","วิธีพิมพ์ 2 ด้าน","B10","กลับหน้าในตัว"),
 ("A11","จำนวน (ชิ้น)","B11",10000),
 ("A12","ค่าตกแต่ง/หลังพิมพ์ เพิ่ม (บาท)","B12",0),
]
for la,lt,ca,cv in inp:
    sc(o,la,lt,B); sc(o,ca,cv,Nf,INP,border=BORD)

# dropdowns
dv_mat = DataValidation(type="list", formula1=f"Prices!$A${mstart}:$A${mend}", allow_blank=False)
o.add_data_validation(dv_mat); dv_mat.add(o["B4"])
dv_meth = DataValidation(type="list", formula1='"พิมพ์หน้าเดียว,กลับหน้าในตัว,Sheetwise"', allow_blank=False)
o.add_data_validation(dv_meth); dv_meth.add(o["B10"])

# derived material props
sc(o,"A14","ชนิดวัสดุ"); sc(o,"B14",'=VLOOKUP(B4,Prices!$A$19:$E$34,2,FALSE)',Nf)
sc(o,"A15","หมึก"); sc(o,"B15",'=IF(B14="sticker",VLOOKUP(B4,Prices!$A$19:$E$34,5,FALSE),"conventional")',Nf)

# calc engine: E=ตัด4, F=ตัด2
sc(o,"D17","รายละเอียด",B,SEC); sc(o,"E17","ตัด 4 (MO 65×48)",B,SEC); sc(o,"F17","ตัด 2 (SM74 74×53)",B,SEC)
# press dims
PW={"E":65,"F":74}; PH={"E":48,"F":53}
labels = {
 18:"n-up (ชิ้น/ใบ)",
 19:"จำนวนสี (เพลท)",
 20:"ด้านพิมพ์",
 21:"ชิ้นสำเร็จ/ใบ",
 22:"ใบพิมพ์ขั้นต่ำ",
 23:"เผื่อเสีย (ใบ)",
 24:"ใบพิมพ์รวม",
 25:"ค่าเพลท",
 26:"ค่าพิมพ์",
 27:"ค่ากระดาษ/วัสดุ",
 28:"ค่าตกแต่งเพิ่ม",
 29:"รวม (บาท)",
}
for r,t in labels.items(): sc(o,f"D{r}",t,Nf,border=BORD)
for col in ("E","F"):
    pw,ph=PW[col],PH[col]
    plateRef = "$B$5" if col=="E" else "$B$6"
    rk = ("cut4_" if col=="E" else "cut2_")
    # nUp
    sc(o,f"{col}18",
       f'=MAX(FLOOR(({pw}-1.2)/($B$6+0.6),1)*FLOOR(({ph}-0.7)/($B$7+0.6),1),'
       f'FLOOR(({pw}-1.2)/($B$7+0.6),1)*FLOOR(({ph}-0.7)/($B$6+0.6),1))',Nf,border=BORD)
    # colorsPlate
    sc(o,f"{col}19",'=IF(B10="Sheetwise",$B$8+$B$9,IF($B$9=0,$B$8,IF(B10="กลับหน้าในตัว",MAX($B$8,$B$9),$B$8+$B$9)))',Nf,border=BORD)
    # sides
    sc(o,f"{col}20",'=IF($B$9=0,1,2)',Nf,border=BORD)
    # finished/sheet
    sc(o,f"{col}21",f'=IF(AND($B$9>0,$B$10="กลับหน้าในตัว"),FLOOR({col}18/2,1),{col}18)',Nf,border=BORD)
    # minSheets
    sc(o,f"{col}22",f'=CEILING($B$11/{col}21,1)',Nf,border=BORD)
    # spoil
    sc(o,f"{col}23",f'=Prices!$B$4*{col}20',Nf,border=BORD)
    # totalSheets
    sc(o,f"{col}24",f'={col}22+{col}23',Nf,border=BORD)
    # plate cost = plateRef * colorsPlate
    sc(o,f"{col}25",f'={plateRef}*{col}19',Nf,border=BORD,numfmt="#,##0.00")
    # perColor via INDEX/MATCH on rate table, key = rk & ink
    flat=f'INDEX(Prices!$B$11:$B$14,MATCH("{rk}"&$B$15,Prices!$A$11:$A$14,0))'
    upto=f'INDEX(Prices!$C$11:$C$14,MATCH("{rk}"&$B$15,Prices!$A$11:$A$14,0))'
    over=f'INDEX(Prices!$D$11:$D$14,MATCH("{rk}"&$B$15,Prices!$A$11:$A$14,0))'
    sc(o,f"{col}26",f'=({flat}+IF({col}24>{upto},({col}24-{upto})*{over},0))*{col}19',Nf,border=BORD,numfmt="#,##0.00")
    # material (paper: พื้นที่ใบพิมพ์×แกรม×บ./กก.÷1e7×markup×ใบ ; sticker: ppc×พื้นที่ชิ้น×(จำนวน+เผื่อเสีย×ชิ้น/ใบ))
    ppk=f'VLOOKUP($B$4,Prices!$A$19:$E$34,3,FALSE)'
    ppc=f'VLOOKUP($B$4,Prices!$A$19:$E$34,4,FALSE)'
    matf=(f'=IF($B$14="paper",'
          f'({pw}*{ph})*$B$5*{ppk}/10000000*Prices!$B$3*{col}24,'
          f'{ppc}*($B$6*$B$7)*($B$11+{col}23*{col}21))')
    sc(o,f"{col}27",matf,Nf,border=BORD,numfmt="#,##0.00")
    # finishing add
    sc(o,f"{col}28",'=$B$12',Nf,border=BORD,numfmt="#,##0.00")
    # total
    sc(o,f"{col}29",f'={col}25+{col}26+{col}27+{col}28',B,RES,border=BORD,numfmt="#,##0.00")

# result summary
sc(o,"A31","แนะนำเครื่อง",B); sc(o,"B31",'=IF(E29<=F29,"ตัด 4 (MO)","ตัด 2 (SM74)")',B)
sc(o,"A32","ราคารวม (ถูกกว่า)",B); sc(o,"B32",'=MIN(E29,F29)',Big,RES,numfmt="฿#,##0.00")
sc(o,"A33","ราคาต่อชิ้น"); sc(o,"B33",'=MIN(E29,F29)/$B$11',Nf,numfmt="฿#,##0.0000")
sc(o,"A35","หมายเหตุ: กลับหน้าในตัว (W&T) ใช้เมื่อสีหน้า=สีหลัง; สีต่างกันเลือก Sheetwise",Sm); o.merge_cells("A35:F35")
sc(o,"A36","ราคาโดยประมาณ ยังไม่รวม VAT/ค่าจัดส่ง",Sm); o.merge_cells("A36:F36")
for col,w in {"A":26,"B":18,"C":3,"D":18,"E":16,"F":16}.items(): o.column_dimensions[col].width=w

# ============ INKJET SHEET ============
j = wb.create_sheet("Inkjet"); j.sheet_view.showGridLines=False
sc(j,"A1","คำนวณราคางานอิงค์เจ็ท",Hf,HFILL); j.merge_cells("A1:D1")
jin=[("A3","วัสดุ","B3","ไวนิล"),("A4","ความละเอียด (dpi)","B4",1440),
     ("A5","กว้าง (เมตร)","B5",3),("A6","สูง (เมตร)","B6",1),
     ("A7","จำนวน (ป้าย)","B7",5),("A8","งานด่วน","B8","ไม่")]
for la,lt,ca,cv in jin: sc(j,la,lt,B); sc(j,ca,cv,Nf,INP,border=BORD)
dvj=DataValidation(type="list",formula1='"ไวนิล,สติ๊กเกอร์ PVC ใหญ่,โฟโต้เปเปอร์,ผ้าแคนวาส,ผ้าป้าย/Backdrop"'); j.add_data_validation(dvj); dvj.add(j["B3"])
dvd=DataValidation(type="list",formula1='"720,1440"'); j.add_data_validation(dvd); dvd.add(j["B4"])
dvr=DataValidation(type="list",formula1='"ใช่,ไม่"'); j.add_data_validation(dvr); dvr.add(j["B8"])
sc(j,"A10","พื้นที่รวม (ตร.ม.)"); sc(j,"B10",'=B5*B6*B7',Nf,numfmt="0.00")
# rate
rate=('=IF(B3="ไวนิล",IF(B10<=Prices!$A$39,IF(B4=1440,Prices!$C$39,Prices!$B$39),IF(B4=1440,Prices!$C$40,Prices!$B$40)),'
      'IF(B3="สติ๊กเกอร์ PVC ใหญ่",IF(B10<=Prices!$A$42,IF(B4=1440,Prices!$C$42,Prices!$B$42),IF(B4=1440,Prices!$C$43,Prices!$B$43)),'
      'IF(B3="โฟโต้เปเปอร์",IF(B8="ใช่",Prices!$C$45,Prices!$B$45),'
      'IF(B3="ผ้าแคนวาส",IF(B8="ใช่",Prices!$C$46,Prices!$B$46),'
      'IF(B8="ใช่",Prices!$C$47,Prices!$B$47)))))')
sc(j,"A11","เรต (บ./ตร.ม.)"); sc(j,"B11",rate,Nf,numfmt="#,##0.00")
# rush add for vinyl/pvc
rush=('=IF(AND(OR(B3="ไวนิล",B3="สติ๊กเกอร์ PVC ใหญ่"),B8="ใช่",B10>=1,B10<50),IF(B4=1440,50,20)*B10,0)')
sc(j,"A12","ค่างานด่วน (เพิ่ม)"); sc(j,"B12",rush,Nf,numfmt="#,##0.00")
sc(j,"A14","ราคารวม (บาท)",B); sc(j,"B14",'=B11*B10+B12',Big,RES,numfmt="฿#,##0.00")
sc(j,"A15","ราคาต่อป้าย"); sc(j,"B15",'=(B11*B10+B12)/B7',Nf,numfmt="฿#,##0.00")
for col,w in {"A":22,"B":18}.items(): j.column_dimensions[col].width=w

wb.save("ThaiPrint-Calculator-Offline.xlsx")
print("saved ThaiPrint-Calculator-Offline.xlsx")
