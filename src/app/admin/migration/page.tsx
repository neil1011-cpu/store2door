'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  DatabaseZap,
  CheckCircle2,
  Lock,
  Zap,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { doc, setDoc, serverTimestamp, getDocs, collection, updateDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Fault-Tolerant Bulk Migration Tool with Logicware Integration and Address Maintenance.
 */

const MIGRATION_DATA = [
  { code: "FSTD10147", first: "Celedia", last: "Mundy", email: "celediamundytamera@gmail.com", phone: "8762787949" },
  { code: "FSTD10127", first: "Christina", last: "Gillard", email: "wsamuyl@yahoo.com", phone: "18762801464" },
  { code: "FSTD10188", first: "Radcliffe", last: "Bromfield", email: "ssincerely@gmail.com", phone: "18763601322" },
  { code: "FSTD10106", first: "Venesa", last: "White", email: "venesawhite@gmail.com", phone: "8764896626" },
  { code: "FSTD10105", first: "Doreen", last: "Longbridge", email: "doreenlongbridge@gmail.com", phone: "8766336884" },
  { code: "FSTD10161", first: "Label", last: "Crafts", email: "keisha.anderson@label-crafts.com", phone: "8769060927" },
  { code: "FSTD10156", first: "Romario", last: "Miller", email: "romariomiller3636@gmail.com", phone: "18767847503" },
  { code: "FSTD10207", first: "Dwayne & Tricia", last: "Brown", email: "dwaynebrown7661@gmail.com", phone: "8763520625" },
  { code: "FSTD10152", first: "Stacey Ann", last: "Harley", email: "stacyabees@gmail.com", phone: "8768960730" },
  { code: "FSTD10167", first: "Tasha", last: "Howell", email: "howell_tasha@live.co.uk", phone: "8768538414" },
  { code: "FSTD10163", first: "Ramona", last: "Witter", email: "ramonawitter@gmail.com", phone: "18765127266" },
  { code: "FSTD10197", first: "Micheal", last: "Francis", email: "michealfrancis85@yahoo.com", phone: "8767841015" },
  { code: "FSTD10116", first: "Hughdane", last: "Neagle", email: "hughdanen@gmail.com", phone: "4073349812" },
  { code: "FSTD10193", first: "Jheanell", last: "Walker", email: "jheanellwalker1@gmail.com", phone: "8764950036" },
  { code: "FSTD10135", first: "Marshagaye", last: "Beckles", email: "marshabeckles@gmail.com", phone: "18762824596" },
  { code: "FSTD10103", first: "Modi", last: "Sullivan", email: "modilivujam@rungel.net", phone: "87456562233" },
  { code: "FSTD10177", first: "Kemar", last: "Clarke", email: "ckemar62@gmail.com", phone: "8765024774" },
  { code: "FSTD10178", first: "Kemeisha", last: "Bell", email: "kemybelly@yahoo.com", phone: "8768562252" },
  { code: "FSTD10097", first: "Andreen", last: "Neale", email: "neandreen@gmail.com", phone: "8765123143" },
  { code: "FSTD10128", first: "Tracy-ann", last: "Arnold-McInnis", email: "tarnoldmcinnis@yahoo.com", phone: "8763912415" },
  { code: "FSTD10104", first: "Erwin", last: "Bishop", email: "jahwinmusic@gmail.com", phone: "8762277372" },
  { code: "FSTD10165", first: "Dakisha", last: "Hamil", email: "dakishahamil25@gmail.com", phone: "8762911300" },
  { code: "FSTD10107", first: "Andre", last: "Carty", email: "kingandre355@gmail.com", phone: "18768975765" },
  { code: "FSTD10111", first: "Kimberlee", last: "Smith", email: "kimberleesmith07@gmail.com", phone: "8765328022" },
  { code: "FSTD10176", first: "Javier", last: "Conville", email: "CONVILLEJAVIER@YAHOO.COM", phone: "18764045106" },
  { code: "FSTD10194", first: "Sheldon", last: "White", email: "sheldonjw3@gmail.com", phone: "8763744313" },
  { code: "FSTD10109", first: "Mureen", last: "Blake", email: "mureenblake7@gmail.com", phone: "18768066707" },
  { code: "FSTD10159", first: "Jorvaughn", last: "Goodwin", email: "Jorvaughn42@gmail.com", phone: "8765351616" },
  { code: "FSTD10170", first: "Romona", last: "Simms", email: "kimonesimms82@gmail.com", phone: "8765872391" },
  { code: "FSTD10182", first: "Coco", last: "Pryor", email: "genetimar@gmail.com", phone: "8764663938" },
  { code: "FSTD10164", first: "TAMEKA", last: "Spence", email: "tameka.spence@gmail.com", phone: "8762265232" },
  { code: "FSTD10189", first: "Natalee", last: "McDonald", email: "nataleemcdonald55@gmail.com", phone: "8762645501" },
  { code: "FSTD10168", first: "Titan", last: "Hodges", email: "titanhodges5@outlook.com", phone: "16582012177" },
  { code: "FSTD10195", first: "Keron", last: "Smith", email: "spiceybmw@outlook.com", phone: "8668546639" },
  { code: "FSTD10201", first: "Dion", last: "Downer", email: "phatdian25@yahoo.com", phone: "8768323556" },
  { code: "FSTD10202", first: "Felecia", last: "Thompson", email: "Feleciabrown777@gmail.com", phone: "8718884" },
  { code: "FSTD10173", first: "Sheena", last: "Lewis", email: "lewberry7@gmail.com", phone: "8768566573" },
  { code: "FSTD10096", first: "Shereka", last: "Whyte", email: "sherekawhyte2016@gmail.com", phone: "8765628674" },
  { code: "FSTD10187", first: "Lashane", last: "Dacres", email: "dacreslashane@gmail.com", phone: "8762337785" },
  { code: "FSTD10115", first: "Keneisha", last: "Martin", email: "keneshiamartin1@gmail.com", phone: "18763423374" },
  { code: "FSTD10179", first: "Melecia", last: "Carter", email: "ladymelcarter@gmail.com", phone: "8762568980" },
  { code: "FSTD10155", first: "Ionie", last: "Swaby", email: "nafesacarr@gmail.com", phone: "8764607573" },
  { code: "FSTD10174", first: "Peter-Gay", last: "McFarlane", email: "petergay.mcfarlane@yahoo.com", phone: "8762838509" },
  { code: "FSTD10158", first: "Tiana", last: "Harridon", email: "tiana.j.harridon@gmail.com", phone: "8763329301" },
  { code: "FSTD10129", first: "Tashika", last: "Bruce", email: "tashyvibes9@gmail.com", phone: "8768166303" },
  { code: "FSTD10110", first: "Sherona", last: "Williams", email: "sherona_williams@yahoo.com", phone: "8768606144" },
  { code: "FSTD10139", first: "Samantha", last: "Williams", email: "samanthakwilliams@yahoo.com", phone: "8768835520" },
  { code: "FSTD10117", first: "Kelvia", last: "Gordon", email: "kelviagordon9@gmail.com", phone: "8763891614" },
  { code: "FSTD10125", first: "Rochelle", last: "Powell-Kong", email: "rochellekong@gmail.com", phone: "8765487205" },
  { code: "FSTD10149", first: "Clover", last: "Campbell", email: "campbellclover@gmail.com", phone: "8762689900" },
  { code: "FSTD10144", first: "Kenroy", last: "Murray", email: "kenmmurray83@gmail.com", phone: "8765330770" },
  { code: "FSTD10172", first: "Yanique", last: "Hall", email: "yannizzle87@gmail.com", phone: "18764317496" },
  { code: "FSTD10001", first: "FSTD", last: "Customer", email: "fstdinvoices@gmail.com", phone: "8767713071" },
  { code: "FSTD10171", first: "Samere", last: "Bonitto", email: "samerejbomitto@gmail.com", phone: "8767922664" },
  { code: "FSTD10100", first: "Tianna", last: "Hinds", email: "tiannahinds1234@gmail.com", phone: "8768566493" },
  { code: "FSTD10186", first: "Dainty", last: "Williams", email: "daintywilliams31@gmail.com", phone: "8768834615" },
  { code: "FSTD10101", first: "Carol", last: "Kerridge", email: "carolkerridge@yahoo.com", phone: "8763177682" },
  { code: "FSTD10145", first: "Charlene", last: "Easy", email: "easycharlene29@yahoo.com", phone: "18763564746" },
  { code: "FSTD10146", first: "Annakea", last: "Folkes", email: "annakayfolkes70@yahoo.com", phone: "8768131401" },
  { code: "FSTD10184", first: "Marlon", last: "Wilkinson", email: "marlonwilkinson@yahoo.com", phone: "8764313262" },
  { code: "FSTD10143", first: "Kasian", last: "Hall", email: "kasianhall@gmail.com", phone: "18763552183" },
  { code: "FSTD10136", first: "Rashard", last: "Tracey", email: "rashard.tracey@gmail.com", phone: "8768796100" },
  { code: "FSTD10175", first: "Michon", last: "Bell-Daley", email: "kadianbell2424@gmail.com", phone: "8768969624" },
  { code: "FSTD10160", first: "Lloyd", last: "Williams", email: "lloydgwilliams@gmail.com", phone: "18763815137" },
  { code: "FSTD10120", first: "Simone", last: "Minott", email: "simoneminott076@gmail.com", phone: "8763600733" },
  { code: "FSTD10209", first: "Andre", last: "Powell", email: "andre.d.powell@gmail.com", phone: "8769978683" },
  { code: "FSTD10134", first: "Avagale", last: "Ewing", email: "ewingavagale70@gmail.com", phone: "8768510732" },
  { code: "FSTD10121", first: "Kadeen", last: "Baxter-Dacres", email: "dacressimone12@gmail.com", phone: "8764835131" },
  { code: "FSTD10118", first: "Raheem", last: "Desouza", email: "desouzaraheem@gmail.com", phone: "8768412646" },
  { code: "FSTD10192", first: "Petagay", last: "Thompson", email: "denlaja86@hotmail.com", phone: "8764843263" },
  { code: "FSTD10169", first: "Chanikea", last: "Channer", email: "channerchanikea@gmail.com", phone: "8762259117" },
  { code: "FSTD10162", first: "Brittany", last: "Hibbert", email: "britt.hibb@gmail.com", phone: "8762508469" },
  { code: "FSTD10131", first: "Damion", last: "Dawkins", email: "dsdcorupt@msn.com", phone: "8765451307" },
  { code: "FSTD10122", first: "Leroy", last: "Tyrell", email: "juniortyrell29@gmail.com", phone: "8767985986" },
  { code: "FSTD10154", first: "Ashley", last: "Swaby", email: "ashleyswaby8@gmail.com", phone: "8763984476" },
  { code: "FSTD10208", first: "Stacy", last: "Wray", email: "wraystacyann863@gmail.com", phone: "8762835855" },
  { code: "FSTD10132", first: "Kemisha", last: "Gordon", email: "kikigordon271735@gmail.com", phone: "8765421147" },
  { code: "FSTD10205", first: "Roje", last: "Brown", email: "rojebrown70@gmail.com", phone: "18764089367" },
  { code: "FSTD10002", first: "Devon", last: "Noble", email: "selfpowered01@gmail.com", phone: "8763839126" },
  { code: "FSTD10137", first: "Shana Kay", last: "Ingram", email: "shanakayingram@yahoo.com", phone: "8763443787" },
  { code: "FSTD10113", first: "Devonte", last: "Seymour", email: "devonteseymour8@gmail.com", phone: "8765401567" },
  { code: "FSTD10151", first: "Dan’l", last: "Mckay", email: "slick_swag@hotmail.com", phone: "8762903142" },
  { code: "FSTD10166", first: "Kanechia", last: "Morris", email: "kanechiamorris@gmail.com", phone: "18764143119" },
  { code: "FSTD10210", first: "Asa", last: "Leslie", email: "leslieasa@gmail.com", phone: "18764831738" },
  { code: "FSTD10099", first: "Vanessa", last: "Richards", email: "vannyricardz@gmail.com", phone: "8762126263" },
  { code: "FSTD10196", first: "Shane", last: "Clunie", email: "wilbaforce4life4life@yahoo.com", phone: "8763869656" },
  { code: "FSTD10142", first: "Floyd", last: "Burgher", email: "kimhaye@gmail.com", phone: "18768092350" },
  { code: "FSTD10191", first: "Sheryll", last: "Smith", email: "sherylls346@gmail.com", phone: "8768316592" },
  { code: "FSTD10119", first: "Kevontae", last: "Johnson", email: "kevontaej15@gmail.com", phone: "8768053337" },
  { code: "FSTD10212", first: "Trudian", last: "Wade", email: "twade-copeland@stewartsautosales.com", phone: "18764453310" },
  { code: "FSTD10211", first: "Mikala", last: "Stephens", email: "stephensmikala643@gamil.com", phone: "8764072631" },
  { code: "FSTD10098", first: "Ronnette", last: "Thompson", email: "ronzbabes@gmail.com", phone: "8765419813" },
  { code: "FSTD10102", first: "Caudry", last: "Codner", email: "caudrycodner@yahoo.com", phone: "8765735560" },
  { code: "FSTD10126", first: "Larice", last: "Campbell", email: "Shaniquecampbell671@gmail.com", phone: "18767722856" },
  { code: "FSTD10203", first: "Saverio", last: "Allen", email: "Plati17@hotmail.com", phone: "8762142331" },
  { code: "FSTD10204", first: "Ricardo", last: "Wray", email: "ricray_11_ardo@yahoo.com", phone: "8765659430" },
  { code: "FSTD10133", first: "Kirk", last: "Walton", email: "waltonkirk@ymail.com", phone: "18765077216" },
  { code: "FSTD10108", first: "Amanda", last: "Robinson", email: "amandarobinson36@yahoo.com", phone: "8763499980" },
  { code: "FSTD10130", first: "Marvin", last: "Senior", email: "vinnoboy17@gmail.com", phone: "8763296273" },
  { code: "FSTD10198", first: "Collis", last: "King", email: "Sillo_16@yahoo.com", phone: "18765348366" },
  { code: "FSTD10153", first: "Dyeima", last: "Kerr", email: "williamsdyeima@gmail.com", phone: "8764394499" },
  { code: "FSTD10183", first: "Aneisha", last: "Watson", email: "Belleann_7@yahoo.com", phone: "8765440732" },
  { code: "FSTD10150", first: "Elisha", last: "Bernard", email: "elisha86bernard@gmail.com", phone: "18768870823" },
  { code: "FSTD10199", first: "Janice", last: "Hinds", email: "janices.hinds@gmail.com", phone: "8768893593" },
  { code: "FSTD10063", first: "Simone", last: "Jackson", email: "simonejackson278@gmail.com", phone: "18764795735" },
  { code: "FSTD10041", first: "Kemoy", last: "Evelyn", email: "kemar_455@yahoo.com", phone: "8763627214" },
  { code: "FSTD10039", first: "Camille", last: "Dacres", email: "camille.dacres@yahoo.com", phone: "8763710972" },
  { code: "FSTD10222", first: "Felicia", last: "James", email: "felijames876@gmail.com", phone: "18764308937" },
  { code: "FSTD10025", first: "Judith", last: "Cole", email: "dijadiki@hotmail.com", phone: "7547019486" },
  { code: "FSTD10250", first: "Jessica", last: "Henry", email: "jessicahenry218@gmail.com", phone: "8764675033" },
  { code: "FSTD10254", first: "Kimarnie", last: "Edwards", email: "rojaeedwards@gmail.com", phone: "8768202889" },
  { code: "FSTD10223", first: "Kimberly", last: "Richards", email: "myadelric@yahoo.com", phone: "8765126377" },
  { code: "FSTD10219", first: "Belva", last: "Goodwin", email: "belvaagoodwin@gmail.com", phone: "8765133980" },
  { code: "FSTD10023", first: "Shayna", last: "Lyons", email: "shaynalyons54@gmail.com", phone: "8765870482" },
  { code: "FSTD10082", first: "Tamara", last: "Francis", email: "Tmr_frncs@yahoo.com", phone: "8762913687" },
  { code: "FSTD10273", first: "Jason", last: "Chambers", email: "zackryx@yahoo.com", phone: "8768913921" },
  { code: "FSTD10274", first: "Alicia", last: "Whyte", email: "alicia75whyte@gmail.com", phone: "18764671134" },
  { code: "FSTD10017", first: "Jonique", last: "Spence", email: "sjonique77@gmail.com", phone: "18767777482" },
  { code: "FSTD10215", first: "Troy", last: "Morgan", email: "troymorgan778@gmail.com", phone: "8765837146" },
  { code: "FSTD10280", first: "Henroy", last: "Salmon", email: "Henroy2001@gmail.com", phone: "18763993770" },
  { code: "FSTD10044", first: "Sanga", last: "Gayle", email: "keenagayle@gmail.com", phone: "8764620960" },
  { code: "FSTD10293", first: "Antonique", last: "Brissett", email: "brissettantonique@gmail.com", phone: "18763559566" },
  { code: "FSTD10275", first: "Tamara", last: "Stewart", email: "kadia8302@gmail.com", phone: "8763792290" },
  { code: "FSTD10261", first: "Oshine", last: "Shields", email: "Shieldsoshine76@gmail.com", phone: "8769092649" },
  { code: "FSTD10048", first: "Travis", last: "Leadbeater", email: "travisleadbeater49@gmail.com", phone: "8768868716" },
  { code: "FSTD10279", first: "Kyle", last: "Allijohn", email: "faith8life88@gmail.com", phone: "8762996595" },
  { code: "FSTD10078", first: "Donnett", last: "Jackson", email: "jacksondonnett@gmail.com", phone: "8764416030" },
  { code: "FSTD10088", first: "Charlene", last: "Chinlyn", email: "charlenechinlyn24@gmail.com", phone: "8764011559" },
  { code: "FSTD10272", first: "Flavia", last: "Harris", email: "flaviahrrs@gmail.com", phone: "8762272775" },
  { code: "FSTD10227", first: "Ajay", last: "Mullings", email: "ajaymullings@rocketmail.com", phone: "8763885574" },
  { code: "FSTD10054", first: "Marcia", last: "Morrison", email: "hotwax16@hotmail.com", phone: "499870129" },
  { code: "FSTD10043", first: "Ann-Marie", last: "Gordon", email: "annmariegordon123@hotmail.com", phone: "8763895496" },
  { code: "FSTD10244", first: "Shanique", last: "Johnson", email: "shanpaye1511@yahoo.com", phone: "8767986128" },
  { code: "FSTD10251", first: "Alex", last: "Smith", email: "lexxus44@yahoo.com", phone: "8765697306" },
  { code: "FSTD10058", first: "Kirk", last: "Simms", email: "Kirkcsimms876@gmail.com", phone: "87651338254" },
  { code: "FSTD10074", first: "Grace", last: "Frazer", email: "frazer.gracegf@gmail.com", phone: "8768716880" },
  { code: "FSTD10214", first: "Kayla", last: "Wolfe", email: "kaykaycunningham188@gmail.com", phone: "1876-4306-200" },
  { code: "FSTD10294", first: "Gary", last: "Brooks", email: "Brooksgary49@gmail.com", phone: "18762372819" },
  { code: "FSTD10242", first: "Raja", last: "Spence", email: "Raja.spence7@gmail.com", phone: "8769953562" },
  { code: "FSTD10031", first: "Dameon", last: "Silvera", email: "dameonsilvera@gmail.com", phone: "8764866573" },
  { code: "FSTD10277", first: "Kenesia", last: "Price-Sutherland", email: "Kenesia26price@gmail.com", phone: "876-368-3717" },
  { code: "FSTD10050", first: "Tanice", last: "Brown", email: "tajaunnabrown097@gmail.com", phone: "8764940069" },
  { code: "FSTD10226", first: "Samanta", last: "Brown", email: "samantha_brown2018@outlook.com", phone: "8764057365" },
  { code: "FSTD10006", first: "Clinton", last: "Ricketts", email: "oriana1234r@gmail.com", phone: "8768372176" },
  { code: "FSTD10068", first: "Norris", last: "Tucker", email: "tuckersean274@gmail.com", phone: "18765493370" },
  { code: "FSTD10248", first: "Dee", last: "Diona", email: "dionasutherland@yahoo.com", phone: "8768150020" },
  { code: "FSTD10255", first: "Judith", last: "Smith", email: "judith.smith@rocketmail.com", phone: "8768190641" },
  { code: "FSTD10067", first: "Shanta", last: "Osbourne", email: "saosbourne555m@gmail.com", phone: "8769954293" },
  { code: "FSTD10036", first: "Nicola", last: "Swaby", email: "Nicola_swaby@yahoo.com", phone: "8763845560" },
  { code: "FSTD10060", first: "Andre", last: "Richards", email: "a_richards90@yahoo.com", phone: "8765082815" },
  { code: "FSTD10069", first: "Shenika", last: "Capleton", email: "sncapleton@yahoo.com", phone: "8768995612" },
  { code: "FSTD10241", first: "Hannah-Rie", last: "Davis", email: "dhannahrie@gmail.com", phone: "8765027869" },
  { code: "FSTD10072", first: "Nadine", last: "Beckford", email: "nadinesbeckford@gmail.com", phone: "876- 335-4580" },
  { code: "FSTD10024", first: "Peterking", last: "Loney", email: "peterkingloney@gmail.com", phone: "18769901604" },
  { code: "FSTD10228", first: "Chavel", last: "Shields", email: "chavelshields47@gmail.com", phone: "8765447811" },
  { code: "FSTD10229", first: "Sashina", last: "Young", email: "sashinayoung974@gmail.com", phone: "8764475133" },
  { code: "FSTD10080", first: "Odaine", last: "Martin", email: "odainemartin98@gmail.com", phone: "8763308479" },
  { code: "FSTD10087", first: "Lauren", last: "Meghoo", email: "laurenmeghoo@gmail.com", phone: "8763816127" },
  { code: "FSTD10236", first: "Rianna", last: "Bowen", email: "riannabowen123@gmail.com", phone: "8763383861" },
  { code: "FSTD10247", first: "Shamar", last: "Brown", email: "Shamarbrown4003@gmail.com", phone: "8764631311" },
  { code: "FSTD10011", first: "Crystal", last: "Taylor", email: "crissey_t@yahoo.com", phone: "8764316130" },
  { code: "FSTD10091", first: "Toni-ann", last: "Francis", email: "tonifrancis360@gmail.com", phone: "8764056696" },
  { code: "FSTD10089", first: "Conroy", last: "Adair", email: "conroyadairg@gmail.com", phone: "8765984424" },
  { code: "FSTD10290", first: "Catherine", last: "Gregory", email: "cathnerr@hotmail.com", phone: "18768335755" },
  { code: "FSTD10012", first: "Yanique", last: "McGregor", email: "ycmcgregor@gmail.com", phone: "18763872073" },
  { code: "FSTD10033", first: "Samara", last: "Euter", email: "eutersamara@yahoo.com", phone: "8768992165" },
  { code: "FSTD10022", first: "Ashley", last: "Johnson", email: "ashleyjohnson5t1@gmail.com", phone: "8768916259" },
  { code: "FSTD10059", first: "Terrascapes", last: "Landscaping", email: "terrascapes3inc@gmail.com", phone: "18765120833" },
  { code: "FSTD10295", first: "Nathan", last: "Mcfarlane", email: "mcfarlanenathan39@gmail.com", phone: "8762048021" },
  { code: "FSTD10291", first: "Kemar", last: "Blackwood", email: "kemarblackwood54@gmail.com", phone: "8762256080" },
  { code: "FSTD10233", first: "Sophia", last: "Hamilton", email: "sophiahamilton121@gmail.com", phone: "876 313 8810" },
  { code: "FSTD10282", first: "Alyssa", last: "Adair", email: "alyssaadair26@gmail.com", phone: "8768179520" },
  { code: "FSTD10281", first: "Richard", last: "West", email: "donstulla66@gmail.com", phone: "18762898962" },
  { code: "FSTD10093", first: "Jhaun", last: "McKenzie", email: "jhaunmckenzie2@gmail.com", phone: "8765381875" },
  { code: "FSTD10276", first: "Chevenae", last: "Reif", email: "chevenaeeereif@icloud.com", phone: "8765458437" },
  { code: "FSTD10221", first: "Jeorjette", last: "Clarke", email: "angeleyetwo38@gmail.com", phone: "8765548845" },
  { code: "FSTD10238", first: "Teshawn", last: "Henry", email: "shawnhenry1700@gmail.com", phone: "8767739244" },
  { code: "FSTD10237", first: "Shane", last: "Davis", email: "shanedavis714@gmail.com", phone: "8764402849" },
  { code: "FSTD10246", first: "Sonya", last: "Tyrell", email: "Tyrell7ann@gmail.com", phone: "18764359590" },
  { code: "FSTD10253", first: "Clive", last: "Gordon", email: "clivegordon0614@gmail.com", phone: "18763995202" },
  { code: "FSTD10014", first: "Karon", last: "Campbell", email: "karoncampbellmicheal@gmail.com", phone: "8763324863" },
  { code: "FSTD10262", first: "Cassie", last: "Smith", email: "smithcassie817@gmail.com", phone: "876-503-2981" },
  { code: "FSTD10271", first: "Ashanta", last: "Johnson", email: "AshantaJohnson1234@gmail.com", phone: "8768645490" },
  { code: "FSTD10230", first: "Jermaine", last: "Hall", email: "jerryjeyhall@gmail.com", phone: "18765040698" },
  { code: "FSTD10235", first: "Desrica", last: "Mason", email: "masonshaniel19@gmail.com", phone: "18765845091" },
  { code: "FSTD10013", first: "Shena", last: "Campbell", email: "Shena_camp08@yahoo.com", phone: "8764375028" },
  { code: "FSTD10266", first: "Peachanay", last: "Simms", email: "Kerrenekayd@gmail.com", phone: "18768841450" },
  { code: "FSTD10079", first: "Neissa", last: "Watson", email: "neissawcross@icloud.com", phone: "8767922909" },
  { code: "FSTD10051", first: "Tianna", last: "Morgan", email: "tiannamorganstm@gmail.com", phone: "8763909839" },
  { code: "FSTD10287", first: "Anthony", last: "Senior", email: "senioranthony@yahoo.com", phone: "8767736177" },
  { code: "FSTD10218", first: "Tanisha", last: "Evelyn", email: "tq506frassqueen@gmail.com", phone: "8765067565" },
  { code: "FSTD10018", first: "Marvin", last: "Stewart", email: "marvinstewart54@yahoo.com", phone: "8768967501" },
  { code: "FSTD10085", first: "Lisa", last: "Hay Gordon", email: "Ltahay@yahoo.com", phone: "8768666886" },
  { code: "FSTD10239", first: "Tesha", last: "Anderson", email: "tesh_4eva@yahoo.com", phone: "8764879778" },
  { code: "FSTD10037", first: "Karl", last: "Hinds", email: "karlhindsshindss@gmail.com", phone: "18769905892" },
  { code: "FSTD10081", first: "Ashaloy", last: "Prince", email: "ashaloyprince7@gmail.com", phone: "8762209560" },
  { code: "FSTD10296", first: "Serie", last: "Mitchell", email: "serenamitchelkm@gmail.com", phone: "8765396409" },
  { code: "FSTD10231", first: "Andrian", last: "Shawsmith", email: "andrian.shawsmith@gmail.com", phone: "18768373856" },
  { code: "FSTD10213", first: "Ricardo", last: "Whitely", email: "Whitely.ricardo@yahoo.com", phone: "8768665883" },
  { code: "FSTD10094", first: "Ravia", last: "Wallen", email: "raviawallen85@gmail.com", phone: "8768697420" },
  { code: "FSTD10064", first: "Jevaughn", last: "East", email: "jevaughneast2@gmail.com", phone: "8765978726" },
  { code: "FSTD10283", first: "Keino", last: "Performance", email: "Keino_brown@hotmail.com", phone: "8764720300" },
  { code: "FSTD10257", first: "Sue-Ann", last: "Roache", email: "sueann.roache@gmail.com", phone: "8763440465" },
  { code: "FSTD10077", first: "Larissa", last: "Campbell", email: "larissacampbell234@gmail.com", phone: "8767931963" },
  { code: "FSTD10042", first: "Shaphan", last: "Walcott", email: "akeniedonedeal24@gmail.com", phone: "8765919015" },
  { code: "FSTD10249", first: "Patriece", last: "Armstrong", email: "patriecearmstrong@hotmail.com", phone: "8765505824" },
  { code: "FSTD10046", first: "Albert", last: "Diah", email: "albertdiah@gmail.com", phone: "8769671389" },
  { code: "FSTD10047", first: "Lloyd", last: "Stewart", email: "lloydstewart19@yahoo.com", phone: "8764719311" },
  { code: "FSTD10057", first: "Donna-Rie", last: "Davis-Knight", email: "donnariedavis12@gmail.com", phone: "8765490811" },
  { code: "FSTD10065", first: "Adwin", last: "Dawkins", email: "djskoolbwoy2013@gmail.com", phone: "18764202667" },
  { code: "FSTD10028", first: "Thashana", last: "Sinclair", email: "sinclairthashana@gmail.com", phone: "18763457528" },
  { code: "FSTD10258", first: "Stephanie", last: "Haye", email: "stewartstephanie04@gmail.com", phone: "8764389718" },
  { code: "FSTD10263", first: "Britany", last: "Henry", email: "henrybritany203@gmail.com", phone: "18768122167" },
  { code: "FSTD10015", first: "Danielle", last: "Moodie", email: "ashleighmoodie@yahoo.com", phone: "18764452607" },
  { code: "FSTD10026", first: "Glenrick", last: "Dennis", email: "bootlord1@hotmail.com", phone: "8763824650" },
  { code: "FSTD10232", first: "Richard", last: "Gunn", email: "richardgunn1999@gmail.com", phone: "8768787739" },
  { code: "FSTD10020", first: "Shadaye", last: "Taylor", email: "taylorshadaye@gmail.com", phone: "8765455712" },
  { code: "FSTD10217", first: "Keisha", last: "Anderson", email: "KEISHA2006A@GMAIL.COM", phone: "8763899359" },
  { code: "FSTD10083", first: "Beatrice", last: "Whitter", email: "jwhitter50@gmail.com", phone: "8764702757" },
  { code: "FSTD10285", first: "Jamaka", last: "Hall", email: "jamakax1000@gmail.com", phone: "8366267" },
  { code: "FSTD10010", first: "FSTD", last: "ADMIN", email: "fromstore2door@gmail.com", phone: "8767713071" },
  { code: "FSTD10252", first: "Odean", last: "Jenkins", email: "kimarjenkins20@gmail.com", phone: "8768455721" },
  { code: "FSTD10256", first: "Harold", last: "Mitchell", email: "mghharold@gmail.com", phone: "8762997744" },
  { code: "FSTD1", first: "Malko", last: "Young", email: "malkoy876@gmail.com", phone: "8763727198" },
  { code: "FSTD10045", first: "Mezan", last: "Graham", email: "mezan_dennis@yahoo.com", phone: "8762906754" },
  { code: "FSTD10284", first: "Karene", last: "Taylor-James", email: "Karenetaylor16@gmail.com", phone: "18765811138" },
  { code: "FSTD10038", first: "Peter", last: "Christie", email: "adrian4nyne@live.com", phone: "8768091346" },
  { code: "FSTD10032", first: "Oshane", last: "Williams", email: "oshanewilliams@649gmail.com", phone: "18762834080" },
  { code: "FSTD10260", first: "Sean", last: "Lewis", email: "seanlewis82@gmail.com", phone: "8764579028" },
  { code: "FSTD10289", first: "Kyle", last: "Anderson", email: "kylearmani@gmail.com", phone: "8765052625" },
  { code: "FSTD10086", first: "Kemar", last: "Fenderson", email: "kemarfenderson@gmail.com", phone: "8765082491" },
  { code: "FSTD10265", first: "Chemoy", last: "Morgan", email: "chemoy8morgan@gmail.com", phone: "876-870-5227" },
  { code: "FSTD10220", first: "Paulette", last: "Wynter", email: "pwyntercrossfield@yahoo.com", phone: "8768338098" },
  { code: "FSTD10259", first: "Sheldon", last: "Badwah", email: "greenknight260@hotmail.com", phone: "87638455734" },
  { code: "FSTD10016", first: "Shadae", last: "Young", email: "shadaelewis876@gmail.com", phone: "8764355126" },
  { code: "FSTD10075", first: "Sean", last: "Pearson", email: "seanpfrebak@gmail.com", phone: "18763903370" },
  { code: "FSTD10076", first: "Tamara", last: "Watson", email: "mackida42watson@gmail.com", phone: "8764347955" },
  { code: "FSTD10270", first: "Shantal", last: "McCubbin", email: "shan.mccubbin@yahoo.com", phone: "18762967077" },
  { code: "FSTD10269", first: "Lorraine", last: "Harris", email: "Lorraineharris417@gmail.com", phone: "18763284999" },
  { code: "FSTD10071", first: "George", last: "Chambers", email: "georgechambers@gmail.com", phone: "8768954490" },
  { code: "FSTD10264", first: "Fay", last: "Campbell", email: "Faycampbell09@gmail.com", phone: "8768949592" },
  { code: "FSTD10030", first: "Richard", last: "Ewart", email: "roli2001@msn.com", phone: "8768570501" },
  { code: "FSTD10278", first: "Linky", last: "Thomas", email: "linkythomas82@gmail.com", phone: "8768789383" },
  { code: "FSTD10021", first: "Marvin", last: "Mcgregor", email: "marvinnex19@yahoo.com", phone: "8763697258" },
  { code: "FSTD10292", first: "Xalia", last: "Williams", email: "chosenly.unknown0031@gmail.com", phone: "18763046144" },
  { code: "FSTD10070", first: "Deneshia", last: "Stennett", email: "deneshiaja@yahoo.com", phone: "8763285427" },
  { code: "FSTD10066", first: "Patrick", last: "Allen", email: "patrickallen17@gmail.com", phone: "9177038987" },
  { code: "FSTD10243", first: "Cavaye", last: "James", email: "jamescavaye@gmail.com", phone: "8765691592" },
  { code: "FSTD10029", first: "Jordane", last: "Hayre", email: "hayrejordane@yahoo.com", phone: "8768362546" },
  { code: "FSTD10286", first: "Renae", last: "Gayle", email: "palstacy@yahoo.com", phone: "8764501112" },
  { code: "FSTD10245", first: "Saran", last: "Reeves", email: "saranreeves@gmail.com", phone: "18763880889" },
  { code: "FSTD10302", first: "From Store 2", last: "Door Shipping", email: "fromstoretoodoor@gmail.com", phone: "18767713071" },
  { code: "FSTD10303", first: "Alouda", last: "Black", email: "fromstoretoodoorja@gmail.com", phone: "876-4316130" },
  { code: "FSTD10304", first: "Kerrene", last: "Downer", email: "simmspea@gmail.com", phone: "18762855035" },
  { code: "FSTD10305", first: "Rohan", last: "Inter", email: "rohanbrown614@gmail.com", phone: "18763636364" },
  { code: "FSTD10306", first: "Keiara", last: "Thomas", email: "keiarathomas360@gmail.com", phone: "8764418071" },
  { code: "FSTD10307", first: "Unian", last: "Laxyso", email: "laxyso@logsmarter.net", phone: "5551234567" },
  { code: "FSTD10308", first: "Paulette", last: "Small", email: "paulette.24small@gmail.com", phone: "8767906650" },
  { code: "FSTD10309", first: "Cameka", last: "Grant", email: "Cameka_grant@yahoo.com", phone: "18763572433" },
  { code: "FSTD10310", first: "Richard", last: "Baker", email: "richiebabyface.rb@gmail.com", phone: "8763935082" },
  { code: "FSTD10313", first: "Tishanna", last: "Maxwell", email: "maxwell.tishanna@gmail.com", phone: "8762637436" },
  { code: "FSTD10314", first: "Nickesha", last: "Scott", email: "nickesha_scott@yahoo.com", phone: "3066904186" },
  { code: "FSTD10315", first: "Taleka", last: "Brown", email: "brownsamantha772@gmail.com", phone: "8764057365" },
  { code: "FSTD10316", first: "Shanique", last: "Brady", email: "Shaniquemoses023@gmail.com", phone: "8765731737" },
  { code: "FSTD10317", first: "Jodyann", last: "Campbell", email: "Jodyanncampbell333@gmail.com", phone: "8763907109" },
  { code: "FSTD10318", first: "Melaine", last: "King", email: "roachemelaine@yahoo.com", phone: "8764554794" },
  { code: "FSTD10319", first: "Judith", last: "Smith", email: "69juan19@gmail.com", phone: "18622139553" },
  { code: "FSTD10320", first: "Marques", last: "Campbell", email: "marcus89070@gmail.com", phone: "8765199557" },
  { code: "FSTD10321", first: "Oneil", last: "Smiley", email: "admin@neilussolutions.com", phone: "18768054497" },
  { code: "FSTD10322", first: "Michael", last: "Brown", email: "fedupait@gmail.com", phone: "8765184888" },
  { code: "FSTD10323", first: "Joan", last: "Francis", email: "joanfrancis40@gmail.com", phone: "8763363935" },
  { code: "FSTD10324", first: "Jeorjette", last: "Clarke", email: "jeorjetteclarke40@gmail.com", phone: "8765548845" },
  { code: "FSTD10325", first: "Terecia", last: "Wallace", email: "rolexkide88@gmail.com", phone: "8763699867" },
  { code: "FSTD10326", first: "Thashana", last: "Sinclair", email: "sinclairthashana91@gmail.com", phone: "18763457528" },
  { code: "FSTD10327", first: "Shamar", last: "Brown", email: "brainbox4003@gmail.com", phone: "8764631311" },
  { code: "FSTD10328", first: "Richard", last: "Ewart", email: "rolidanger2025@gmail.com", phone: "8768091680" },
  { code: "FSTD10329", first: "Denton", last: "Gordon", email: "risksec.consultant@gmail.com", phone: "8765095712" },
  { code: "FSTD10330", first: "Sheril", last: "Goldson", email: "sheril2@hotmail.com", phone: "8763890041" },
  { code: "FSTD10331", first: "Annette", last: "Adams", email: "analad19@gmail.com", phone: "8768082248" },
  { code: "FSTD10332", first: "Donovan", last: "Leon", email: "donovan.leon2@gmail.com", phone: "8768342563" },
  { code: "FSTD10333", first: "Kimberly", last: "Bruce", email: "tazimktho@gmail.com", phone: "8765070572" },
  { code: "FSTD10334", first: "Sophana", last: "Burton", email: "sophanaburton68@gmail.com", phone: "8135855429" },
  { code: "FSTD10335", first: "Shanique", last: "Brady", email: "shaniquebrady9@gmail.com", phone: "8765731737" },
  { code: "FSTD10336", first: "Shaunalee", last: "Smith", email: "shamaradixon641@gmail.com", phone: "876-857-4273" },
  { code: "FSTD10337", first: "Samara", last: "Vissay", email: "samaravissay@gmail.com", phone: "8768385667" },
  { code: "FSTD10338", first: "Amelia", last: "Miller", email: "ameliamill42@gmail.com", phone: "8767005572" },
  { code: "FSTD10339", first: "Christopher", last: "Miller", email: "globalwallet8@gmail.com", phone: "876319-2444" },
  { code: "FSTD10340", first: "Dwayne", last: "WIlliams", email: "Williamsdwayne441@gmail.com", phone: "876 351 3135" },
  { code: "FSTD10341", first: "Oshine", last: "Shields", email: "Oshineshields1@gmail.com", phone: "876 9092649" },
  { code: "FSTD10342", first: "SASHAGAY", last: "TAYLOR", email: "tsashagay@yahoo.com", phone: "8764843936" },
  { code: "FSTD10343", first: "Nickeisha", last: "Lindsay", email: "nickeishalindsay5@gmail.com", phone: "18762976237" }
];

const NEW_DEFAULT_ADDRESS = {
    address1: '3507 NW 19th ST',
    city: 'Lauderdale Lake',
    state: 'FL',
    zip: '33311-4224',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export default function MigrationPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const [isMigrating, setIsMigrating] = useState(false);
  const [isUpdatingAddresses, setIsUpdatingAddresses] = useState(false);
  const [doLogicwareSync, setDoLogicwareSync] = useState(true);
  const [logs, setLogs] = useState<{message: string, type: 'success' | 'error' | 'info' | 'logicware'}[]>([]);
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
  });

  const runMigration = async () => {
    setIsMigrating(true);
    setLogs([]);
    
    const logicwareKey = localStorage.getItem('LOGICWARE_API_KEY');
    
    setProgress({
      current: 0,
      total: MIGRATION_DATA.length,
    });

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
          throw new Error('Authorization required. Please sign out and sign back in to refresh your admin session.');
      }

      const idToken = await currentUser.getIdToken(true);

      for (const user of MIGRATION_DATA) {
        let retryCount = 0;
        let processed = false;

        while (!processed && retryCount < 2) {
            try {
                const res = await fetch('/api/admin/create-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        firstName: user.first?.trim(),
                        lastName: user.last?.trim(),
                        email: user.email?.trim().toLowerCase(),
                        phone: user.phone?.trim(),
                        mailboxNumber: user.code?.trim(),
                        defaultPassword: 'User@1234'
                    }),
                });

                const result = await res.json();
                if (res.status === 429) {
                    setLogs(prev => [...prev, { message: `RATE LIMIT: Backing off 10s...`, type: 'info' }]);
                    await sleep(10000);
                    retryCount++;
                    continue; 
                }

                const userUid = result.uid || result.existingUid;

                if (userUid) {
                    const mailbox = user.code?.trim();
                    const profileRef = doc(firestore, 'users', userUid);
                    
                    await setDoc(profileRef, {
                        id: userUid,
                        fullName: `${user.first} ${user.last}`,
                        firstName: user.first,
                        lastName: user.last,
                        email: user.email?.trim().toLowerCase(),
                        phone: user.phone?.trim(),
                        trn: 'N/A',
                        mailboxNumber: mailbox,
                        address: {
                            ...NEW_DEFAULT_ADDRESS,
                            address2: `${mailbox}-FSTD`,
                        },
                        createdAt: serverTimestamp(),
                        needsPasswordReset: true,
                        pickupPersonnel: [],
                        dropoffAddresses: [],
                    }, { merge: true });

                    setLogs(prev => [...prev, { message: `SYNC: ${user.email} (${mailbox})`, type: 'success' }]);

                    if (doLogicwareSync && logicwareKey) {
                        try {
                            const lwRes = await fetch('/api/admin/logicware-sync', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    apiKey: logicwareKey,
                                    shipper: {
                                        email: user.email?.trim().toLowerCase(),
                                        firstName: user.first,
                                        lastName: user.last,
                                        phone: user.phone?.trim(),
                                        mailbox: mailbox
                                    }
                                })
                            });
                            if (lwRes.ok) {
                                setLogs(prev => [...prev, { message: `LOGICWARE: Shipper ${mailbox} synced.`, type: 'logicware' }]);
                            }
                        } catch (lwErr) {}
                    }

                    processed = true;
                } else {
                    throw new Error(result.message || 'Identity failure');
                }

            } catch (err: any) {
                setLogs(prev => [...prev, { message: `FAILED: ${user.email} - ${err.message}`, type: 'error' }]);
                processed = true; 
            }
        }

        setProgress((prev) => ({
          ...prev,
          current: prev.current + 1,
        }));

        await sleep(1500); 
      }

      toast({ title: 'Worldwide Sync Complete' });
    } catch (err: any) {
      toast({ title: 'Critical Failure', description: err.message, variant: 'destructive' });
    } finally {
      setIsMigrating(false);
    }
  };

  const updateAllUserAddresses = async () => {
      setIsUpdatingAddresses(true);
      setLogs([]);
      try {
          const snapshot = await getDocs(collection(firestore, 'users'));
          const total = snapshot.size;
          setProgress({ current: 0, total });

          for (const userDoc of snapshot.docs) {
              const data = userDoc.data();
              const mailbox = data.mailboxNumber || 'HUB';
              
              await updateDoc(userDoc.ref, {
                  address: {
                      ...NEW_DEFAULT_ADDRESS,
                      address2: `${mailbox}-FSTD`,
                  }
              });

              setLogs(prev => [...prev, { message: `UPDATED ADDRESS: ${mailbox}`, type: 'success' }]);
              setProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }

          toast({ title: "Address Update Complete", description: `Synchronized ${total} user profiles.` });
      } catch (err: any) {
          toast({ title: "Batch Update Failed", description: err.message, variant: 'destructive' });
      } finally {
          setIsUpdatingAddresses(false);
      }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-20">
      <Card className="border-t-4 border-t-primary shadow-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
              <DatabaseZap className="h-8 w-8 text-primary" />
              <div>
                  <CardTitle className="text-2xl font-black italic uppercase tracking-tighter">Worldwide Logistics Sync</CardTitle>
                  <CardDescription>
                    Fault-Tolerant Hybrid Synchronization v6.0
                  </CardDescription>
              </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Alert className="bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900">
                <Lock className="h-4 w-4 text-orange-600" />
                <AlertTitle className="font-bold uppercase text-[10px] tracking-widest text-orange-800 dark:text-orange-400">Temporary Access Key</AlertTitle>
                <AlertDescription className="text-xl font-black italic tracking-tighter text-orange-900 dark:text-orange-200">User@1234</AlertDescription>
            </Alert>
            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900">
                <MapPin className="h-4 w-4 text-blue-600" />
                <AlertTitle className="font-bold uppercase text-[10px] tracking-widest text-blue-800 dark:text-blue-400">Target US Hub</AlertTitle>
                <AlertDescription className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase">
                    3507 NW 19th ST, Lauderdale Lake, FL
                </AlertDescription>
            </Alert>
          </div>

          <div className="flex items-center space-x-3 p-4 rounded-xl border-2 border-dashed bg-muted/30">
            <Checkbox id="lw-sync" checked={doLogicwareSync} onCheckedChange={(v) => setDoLogicwareSync(!!v)} className="h-5 w-5" />
            <div className="grid gap-1.5 leading-none">
                <label htmlFor="lw-sync" className="text-sm font-black uppercase italic cursor-pointer">Sync with Logicware Hub</label>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Registers each user in your external courier portal.</p>
            </div>
          </div>

          {(isMigrating || isUpdatingAddresses) && (
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm font-bold uppercase tracking-widest">
                <span>Progress: {progress.current} / {progress.total}</span>
                <span className="animate-pulse text-primary italic">Syncing Worldwide Data...</span>
              </div>
              <Progress value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0} className="h-3 bg-muted" />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase opacity-60 tracking-widest">Live Activity Stream</Label>
            <ScrollArea className="h-[300px] w-full rounded-md border bg-zinc-950 p-4 shadow-inner">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 opacity-20"><Loader2 className="h-5 w-5 animate-spin mb-2" /><p className="text-[10px] uppercase font-bold">Awaiting authorization...</p></div>
                ) : (
                    <div className="space-y-1 font-mono text-[10px]">
                        {logs.map((log, i) => (
                            <div key={i} className={cn(log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : log.type === 'logicware' ? 'text-blue-400 font-bold' : 'text-zinc-500')}>
                                {log.type === 'success' ? '✓ ' : log.type === 'error' ? '✗ ' : log.type === 'logicware' ? '⚡ ' : '○ '}
                                {log.message}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-4">
          <Button onClick={runMigration} disabled={isMigrating || isUpdatingAddresses} className="w-full h-16 font-black uppercase text-xl italic shadow-2xl">
            {isMigrating ? <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Processing List...</> : <><DatabaseZap className="mr-3 h-5 w-5" /> Authorize 291-User Sync</>}
          </Button>
          
          <Button onClick={updateAllUserAddresses} variant="secondary" disabled={isMigrating || isUpdatingAddresses} className="w-full h-12 font-bold uppercase border-2">
              {isUpdatingAddresses ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Updating Addresses...</> : <><MapPin className="mr-2 h-4 w-4" /> Update All Existing Users to Lauderdale Lake</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
