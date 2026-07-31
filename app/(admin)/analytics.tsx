import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useEffect, useState } from "react";


import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { supabase } from "../../lib/supabase";


const screenWidth =
  Dimensions.get("window").width;


export default function Analytics() {


const [loading,setLoading] =
useState(true);


const [data,setData] =
useState<any>({


/*
========================
EXECUTIVE
========================
*/

users:0,
newUsersToday:0,

dau:0,
wau:0,
mau:0,

stickiness:0,

revenue:0,

valuation:0,
valuationText:"",

growthScore:0,



/*
========================
SOCIAL
========================
*/

reels:0,

liveStreams:0,

groups:0,

messages:0,

statuses:0,

followers:0,

translationUsage:0,



/*
========================
MARKETPLACE
========================
*/


items:0,

verifiedSellers:0,

offers:0,

auctions:0,

ads:0,

banners:0,

promotions:0,

boosts:0,



/*
========================
FARM
========================
*/


farms:0,

verifiedFarms:0,

farmProducts:0,



/*
========================
DELIVERY
========================
*/

deliveries:0,

deliveryRevenue:0,



/*
========================
HEALTH
========================
*/


hospitals:0,

patients:0,

hospitalBookings:0,

emergencySearches:0,



/*
========================
UTILITIES
========================
*/


utilityApplications:0,

utilityRevenue:0,



/*
========================
ELECTIONS
========================
*/


publicBattles:0,

elections:0,

candidates:0,

votes:0,



/*
========================
MENTORSHIP
========================
*/


mentors:0,

students:0,

sessions:0,



/*
========================
TRUST
========================
*/


reports:0,

blockedUsers:0,

fraudScore:0,

trustScore:0,



/*
========================
REFERRAL
========================
*/


referrals:0,


/*
========================
REVENUE
========================
*/


adsRevenue:0,

boostRevenue:0,

promotionRevenue:0,

auctionRevenue:0,


/*
========================
CHART
========================
*/


growth:[],

labels:[],


});





useEffect(()=>{

loadAnalytics();

},[]);





const countTable =
async(
table:string
)=>{

const {
count,
error
}=await supabase
.from(table)
.select("*",
{
count:"exact",
head:true
});


if(error){

console.log(
table,
error.message
);

return 0;

}


return count || 0;

};






const loadAnalytics =
async()=>{


try{


setLoading(true);



/*
========================
USERS
========================
*/


const {
data:usersData
}=await supabase
.from("profiles")
.select(
`
id,
created_at,
phone_verified
`
);



const users =
usersData?.length || 0;



const today =
new Date();

today.setHours(
0,
0,
0,
0
);



const newUsersToday =
usersData?.filter(
(u:any)=>
new Date(
u.created_at
)>=today
).length || 0;





/*
========================
ENGAGEMENT EVENTS
========================
*/


const {
data:events
}=await supabase
.from(
"analytics_events"
)
.select(
`
user_id,
created_at
`
);



const dau =
new Set(
events
?.filter(
(e:any)=>
new Date(
e.created_at
)>=today
)
.map(
(e:any)=>
e.user_id
)
).size;



const sevenDays =
new Date();


sevenDays.setDate(
sevenDays.getDate()-7
);



const wau =
new Set(
events
?.filter(
(e:any)=>
new Date(
e.created_at
)>=sevenDays
)
.map(
(e:any)=>
e.user_id
)
).size;




const thirtyDays =
new Date();


thirtyDays.setDate(
thirtyDays.getDate()-30
);



const mau =
new Set(
events
?.filter(
(e:any)=>
new Date(
e.created_at
)>=thirtyDays
)
.map(
(e:any)=>
e.user_id
)
).size;



const stickiness =
mau
?
Number(
(
dau/mau*100
).toFixed(1)
)
:
0;





/*
========================
SOCIAL
========================
*/


const reels =
await countTable(
"posts"
);



const liveStreams =
await countTable(
"live_streams"
);



const groups =
await countTable(
"groups"
);



const messages =
await countTable(
"messages"
);



const statuses =
await countTable(
"statuses"
);





/*
========================
MARKETPLACE
========================
*/


const items =
await countTable(
"items_live"
);



const ads =
await countTable(
"ads"
);



const banners =
await countTable(
"banner"
);



const promotions =
await countTable(
"promoted"
);



const boosts =
await countTable(
"boosted"
);



const auctions =
await countTable(
"auctions"
);



const offers =
await countTable(
"offers"
);





/*
========================
FARM
========================
*/


const farms =
await countTable(
"farm_profiles"
);



const verifiedFarms =
await countTable(
"farm_profiles"
);





/// ========================
// DELIVERY
// ========================

const deliveries =
await countTable(
  "deliveries"
);


const {
data:deliveryData
}=await supabase
.from("deliveries")
.select("amount");


const deliveryRevenue =
deliveryData?.reduce(
(
sum:number,
item:any
)=>
sum +
Number(item.amount || 0),
0
) || 0;



// ========================
// HEALTH MODULE
// ========================


const hospitals =
await countTable(
  "hospitals"
);



const patients =
await countTable(
  "patients"
);



const hospitalBookings =
await countTable(
  "hospital_bookings"
);



const emergencySearches =
await countTable(
  "emergency_requests"
);





// ========================
// UTILITIES MODULE
// ========================


const utilityApplications =
await countTable(
  "utility_applications"
);



const {
data:utilityData
}=await supabase
.from(
"utility_applications"
)
.select(
"application_fee"
);



const utilityRevenue =
utilityData?.reduce(
(
sum:number,
item:any
)=>
sum +
Number(
item.application_fee || 0
),
0
)
||
0;





// ========================
// ELECTION MODULE
// ========================


const publicBattles =
await countTable(
"battles"
);



const elections =
await countTable(
"elections"
);



const candidates =
await countTable(
"candidates"
);



const votes =
await countTable(
"votes"
);






// ========================
// MENTORSHIP MODULE
// ========================


const mentors =
await countTable(
"mentors"
);



const students =
await countTable(
"mentorship_students"
);



const sessions =
await countTable(
"mentorship_sessions"
);





// ========================
// TRUST & SAFETY
// ========================


const reports =
await countTable(
"reports"
);



const blockedUsers =
await countTable(
"blocked_users"
);



const suspiciousUsers =
usersData?.filter(
(user:any)=>
!user.phone_verified
)
.length || 0;



const fraudScore =
users > 0
?
Number(
(
suspiciousUsers /
users *
100
)
.toFixed(1)
)
:
0;



const trustScore =
100 - fraudScore;






// ========================
// REFERRAL SYSTEM
// ========================


const referrals =
await countTable(
"referrals"
);






// ========================
// REVENUE ENGINE
// ========================


/*
These are estimated
monetization calculations.
Replace with real payments
tables when available.
*/


const adsRevenue =
ads * 3;



const boostRevenue =
boosts * 20;



const promotionRevenue =
promotions * 50;



const auctionRevenue =
auctions * 10;



const battleRevenue =
publicBattles * 20;



const marketplaceRevenue =
items * 5;



const revenue =
adsRevenue +
boostRevenue +
promotionRevenue +
auctionRevenue +
battleRevenue +
marketplaceRevenue +
deliveryRevenue +
utilityRevenue;







// ========================
// VALUATION ENGINE
// ========================


let valuationUSD = 0;



/*
EARLY STAGE
$10M - $30M

Based on:
- users
- product
- technology
- market size
*/


valuationUSD +=
10000000;



valuationUSD +=
users * 150;



valuationUSD +=
dau * 3000;



valuationUSD +=
revenue * 20;





/*
STRONG GHANA TRACTION
$50M - $150M

Multiple verticals:
- Marketplace
- Health
- Farm
- Elections
- Utilities
*/


if(
users > 50000 ||
revenue > 50000
){

valuationUSD +=
50000000;

}



if(
farms > 1000 ||
hospitalBookings > 10000 ||
items > 10000
){

valuationUSD +=
50000000;

}






/*
NATIONAL SCALE

$200M+

Conditions:

- Millions users
- Multiple revenue streams
- National adoption
*/


if(
users > 1000000 &&
revenue > 1000000
){

valuationUSD =
200000000;

}





const usdToGhs =
15.5;



const valuation =
Math.round(
valuationUSD *
usdToGhs
);



const valuationText =
`$${Math.round(
valuationUSD
).toLocaleString()}
(~GH₵ ${valuation.toLocaleString()})`;






// ========================
// FINAL STATE UPDATE
// ========================


setData({

users,
newUsersToday,


dau,
wau,
mau,

stickiness,


reels,

liveStreams,

groups,

messages,

statuses,


items,

ads,

banners,

promotions,

boosts,

auctions,

offers,


farms,

verifiedFarms,


deliveries,

deliveryRevenue,



hospitals,

patients,

hospitalBookings,

emergencySearches,



utilityApplications,

utilityRevenue,



publicBattles,

elections,

candidates,

votes,



mentors,

students,

sessions,



reports,

blockedUsers,

fraudScore,

trustScore,



referrals,



adsRevenue,

boostRevenue,

promotionRevenue,

auctionRevenue,



revenue,


valuation,

valuationText,


});


setData({

users,
newUsersToday,

dau,
wau,
mau,

stickiness,

reels,
liveStreams,
groups,
messages,
statuses,

items,
ads,
banners,
promotions,
boosts,
auctions,
offers,

farms,
verifiedFarms,

});



}
catch(error){

console.log(
"Analytics error",
error
);

}
finally{

setLoading(false);

}


};
if (loading) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#22c55e" />
      <Text style={styles.text}>
        Loading Analytics...
      </Text>
    </View>
  );
}
const generatePitchPDF =
async()=>{

const html = `

<html>

<body style="
font-family:Arial;
padding:30px;
">

<h1>
NASARA INVESTOR REPORT
</h1>


<h2>
Executive Overview
</h2>


<p>
Users:
${data.users}
</p>


<p>
DAU:
${data.dau}
</p>


<p>
MAU:
${data.mau}
</p>


<p>
Revenue:
GH₵ ${data.revenue}
</p>



<h2>
Platform Verticals
</h2>


<p>
Marketplace:
${data.items} products
</p>


<p>
Farms:
${data.farms}
</p>


<p>
Hospitals:
${data.hospitals}
</p>


<p>
Utility Applications:
${data.utilityApplications}
</p>


<p>
Elections:
${data.elections}
</p>


<p>
Mentorship Students:
${data.students}
</p>



<h2>
Revenue Streams
</h2>


<p>
Ads:
GH₵ ${data.adsRevenue}
</p>


<p>
Boosting:
GH₵ ${data.boostRevenue}
</p>


<p>
Promotions:
GH₵ ${data.promotionRevenue}
</p>


<p>
Delivery:
GH₵ ${data.deliveryRevenue}
</p>



<h2>
Investor Valuation
</h2>


<h3>
${data.valuationText}
</h3>



<p>

Early Stage:
US$10M - US$30M

<br/>

Strong Ghana Traction:
US$50M - US$150M

<br/>

National Scale:
US$200M+

</p>



<h2>
Trust
</h2>


<p>
Trust Score:
${data.trustScore}%

</p>


<p>
Fraud Score:
${data.fraudScore}%

</p>



</body>

</html>

`;


const {uri} =
await Print.printToFileAsync({
html
});


await Sharing.shareAsync(uri);


};

// ADD THESE HERE

function Section({
  title,
  children,
}: any) {

  return (
    <View>

      <Text style={styles.section}>
        {title}
      </Text>

      {children}

    </View>
  );

}



function Card({
  title,
  value,
}: any) {

  return (

    <View style={styles.card}>

      <Text style={styles.cardTitle}>
        {title}
      </Text>

      <Text style={styles.cardValue}>
        {value}
      </Text>

    </View>

  );

}





return (

<ScrollView
style={styles.container}
contentContainerStyle={{
paddingBottom:50
}}
>


<Text style={styles.title}>
📊 NASARA ADMIN INTELLIGENCE
</Text>


<Text style={styles.subtitle}>
Complete ecosystem performance,
growth analytics and investor valuation.
</Text>



{/* ================= EXECUTIVE ================= */}


<Section title="🚀 Executive Overview">


<View style={styles.grid}>


<Card
title="Users"
value={data.users}
/>


<Card
title="New Today"
value={data.newUsersToday}
/>


<Card
title="DAU"
value={data.dau}
/>


<Card
title="MAU"
value={data.mau}
/>


<Card
title="Revenue"
value={`GH₵ ${data.revenue}`}
/>


<Card
title="Valuation"
value={data.valuationText}
/>


</View>


</Section>





{/* ================= SOCIAL ================= */}


<Section title="💬 Social Intelligence">


<View style={styles.grid}>


<Card
title="Reels"
value={data.reels}
/>


<Card
title="Live Streams"
value={data.liveStreams}
/>


<Card
title="Groups"
value={data.groups}
/>


<Card
title="Messages"
value={data.messages}
/>


<Card
title="Statuses"
value={data.statuses}
/>


<Card
title="Trust Score"
value={`${data.trustScore}%`}
/>


</View>


</Section>







{/* ================= MARKETPLACE ================= */}


<Section title="🛒 Friday Market">


<View style={styles.grid}>


<Card
title="Products"
value={data.items}
/>


<Card
title="Verified Sellers"
value={data.verifiedSellers}
/>


<Card
title="Offers"
value={data.offers}
/>


<Card
title="Auctions"
value={data.auctions}
/>


<Card
title="Ads"
value={data.ads}
/>


<Card
title="Boosts"
value={data.boosts}
/>


<Card
title="Promotions"
value={data.promotions}
/>


</View>


</Section>








{/* ================= FARM ================= */}


<Section title="🌱 Agriculture">


<View style={styles.grid}>


<Card
title="Farms"
value={data.farms}
/>


<Card
title="Verified Farms"
value={data.verifiedFarms}
/>


<Card
title="Farm Products"
value={data.farmProducts}
/>


</View>


</Section>







{/* ================= DELIVERY ================= */}


<Section title="🚚 Delivery System">


<View style={styles.grid}>


<Card
title="Deliveries"
value={data.deliveries}
/>


<Card
title="Delivery Revenue"
value={`GH₵ ${data.deliveryRevenue}`}
/>


</View>


</Section>








{/* ================= HEALTH ================= */}


<Section title="🏥 Health">


<View style={styles.grid}>


<Card
title="Hospitals"
value={data.hospitals}
/>


<Card
title="Patients"
value={data.patients}
/>


<Card
title="Queue Bookings"
value={data.hospitalBookings}
/>


<Card
title="Emergency Searches"
value={data.emergencySearches}
/>


</View>


</Section>








{/* ================= UTILITIES ================= */}


<Section title="⚡ Utilities">


<View style={styles.grid}>


<Card
title="Applications"
value={data.utilityApplications}
/>


<Card
title="Revenue"
value={`GH₵ ${data.utilityRevenue}`}
/>


</View>


</Section>








{/* ================= ELECTION ================= */}


<Section title="🗳️ Elections">


<View style={styles.grid}>


<Card
title="Public Battles"
value={data.publicBattles}
/>


<Card
title="Elections"
value={data.elections}
/>


<Card
title="Candidates"
value={data.candidates}
/>


<Card
title="Votes"
value={data.votes}
/>


</View>


</Section>








{/* ================= MENTORSHIP ================= */}


<Section title="🎓 Mentorship">


<View style={styles.grid}>


<Card
title="Mentors"
value={data.mentors}
/>


<Card
title="Students"
value={data.students}
/>


<Card
title="Sessions"
value={data.sessions}
/>


</View>


</Section>








{/* ================= TRUST ================= */}


<Section title="🛡️ Trust & Safety">


<View style={styles.grid}>


<Card
title="Reports"
value={data.reports}
/>


<Card
title="Blocked Users"
value={data.blockedUsers}
/>


<Card
title="Fraud Score"
value={`${data.fraudScore}%`}
/>


</View>


</Section>








{/* ================= REFERRAL ================= */}


<Section title="🎁 Referral Engine">


<View style={styles.grid}>


<Card
title="Referrals"
value={data.referrals}
/>


</View>


</Section>








{/* ================= VALUATION ================= */}



<Section title="💰 Investor Valuation">


<View style={styles.valuationBox}>


<Text style={styles.valuationTitle}>
Current Estimated Value
</Text>


<Text style={styles.valuation}>
{data.valuationText}
</Text>



<Text style={styles.text}>

🚀 Early Stage:
{"\n"}
US$10M - US$30M

{"\n\n"}

🇬🇭 Strong Ghana Traction:
{"\n"}
US$50M - US$150M


{"\n\n"}

🌍 National Scale:
{"\n"}
US$200M+

</Text>


</View>


</Section>







<TouchableOpacity
style={styles.button}
onPress={generatePitchPDF}
>


<Text style={styles.buttonText}>
📄 Export Investor Report
</Text>


</TouchableOpacity>



</ScrollView>

);
}

const styles =
StyleSheet.create({

container:{
flex:1,
backgroundColor:"#020617",
padding:20,
},


center:{
flex:1,
justifyContent:"center",
alignItems:"center",
backgroundColor:"#020617",
},



title:{
fontSize:26,
fontWeight:"900",
color:"#22c55e",
marginBottom:8,
},


subtitle:{
color:"#94a3b8",
fontSize:15,
marginBottom:20,
lineHeight:22,
},



section:{
fontSize:20,
fontWeight:"800",
color:"#fff",
marginTop:25,
marginBottom:15,
},



grid:{
flexDirection:"row",
flexWrap:"wrap",
justifyContent:"space-between",
},



card:{
width:"48%",
backgroundColor:"#0f172a",
borderRadius:16,
padding:16,
marginBottom:14,

borderWidth:1,
borderColor:"#1e293b",
},



cardTitle:{
fontSize:14,
color:"#94a3b8",
marginBottom:8,
},



cardValue:{
fontSize:22,
fontWeight:"900",
color:"#22c55e",
},



valuationBox:{
backgroundColor:"#052e16",
padding:20,
borderRadius:20,
borderWidth:1,
borderColor:"#22c55e",
},



valuationTitle:{
fontSize:16,
color:"#bbf7d0",
},



valuation:{
fontSize:28,
fontWeight:"900",
color:"#22c55e",
marginVertical:15,
},



text:{
color:"#cbd5e1",
fontSize:15,
lineHeight:24,
},



button:{
backgroundColor:"#22c55e",
padding:16,
borderRadius:15,
marginTop:30,
alignItems:"center",
marginBottom:40,
},



buttonText:{
color:"#020617",
fontWeight:"900",
fontSize:16,
},



});