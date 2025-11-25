import type { NextPage } from 'next';
import Head from 'next/head';
import GridLayoutComponent from '../components/GridLayout';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Moodboard</title>
      </Head>
      <div className="container">
        <main>
          <GridLayoutComponent />
        </main>
      </div>
    </>
  );
};

export default Home; 